#!/usr/bin/env python3
"""
LiveKit Voice Agent - Jenny (EPIC AI Receptionist)
STT: Deepgram Nova-3
LLM: DeepSeek via OpenAI-compatible API
TTS: edge-tts (en-US-JennyNeural) via custom plugin
VAD: Silero
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid

import edge_tts

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    tts as agent_tts,
)
from livekit.agents.tts import TTS, ChunkedStream, AudioEmitter
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions
from livekit.plugins import deepgram, silero
from livekit.plugins import openai as lk_openai

logger = logging.getLogger("epic-voice-agent")

# --- Credentials ---
DEEPGRAM_API_KEY = "d7f79b8b91aca914349071be679aec1913742baa"
DEEPSEEK_API_KEY = "sk-443f0af69dc14ee095fce92d16928850"
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

SYSTEM_PROMPT = """You are Jenny, a friendly and professional AI receptionist for EPIC AI, a technology company.

Your role:
- Answer calls warmly and professionally
- Help customers with questions about EPIC AI's services (AI agents, voice systems, business automation)
- Take messages when needed
- Offer to transfer to a human agent if you cannot help
- Keep responses SHORT and conversational - this is a phone call, not a chat

Guidelines:
- Keep responses under 2 sentences when possible
- Speak naturally as if on a phone call
- Ask one question at a time
- Be warm but efficient
- If asked to transfer, say "I'll transfer you now, please hold."
- If you can't answer something, offer to take a message for the team

You are speaking via phone, so avoid any formatting, bullet points, or markdown."""

SAMPLE_RATE = 24000
NUM_CHANNELS = 1


class EdgeTTSChunkedStream(ChunkedStream):
    def __init__(self, *, tts: "EdgeTTS", input_text: str, conn_options: APIConnectOptions) -> None:
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._tts_instance: EdgeTTS = tts

    async def _run(self, output_emitter: AudioEmitter) -> None:
        voice = self._tts_instance._voice
        text = self.input_text

        # Collect all audio bytes from edge-tts (returns MP3)
        communicate = edge_tts.Communicate(text, voice)
        mp3_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_data.extend(chunk["data"])

        if not mp3_data:
            logger.warning("EdgeTTS returned no audio for: %s", text[:50])
            return

        # Convert MP3 to raw PCM via ffmpeg
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg",
            "-i", "pipe:0",
            "-f", "s16le",
            "-ar", str(SAMPLE_RATE),
            "-ac", str(NUM_CHANNELS),
            "pipe:1",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        pcm_data, _ = await proc.communicate(input=bytes(mp3_data))

        if not pcm_data:
            logger.warning("ffmpeg returned no PCM data")
            return

        # Feed PCM to the emitter
        request_id = str(uuid.uuid4())
        output_emitter.initialize(
            request_id=request_id,
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
            mime_type="audio/pcm",
        )
        # Push in chunks
        chunk_size = 4800  # 100ms at 24kHz 16-bit mono
        for i in range(0, len(pcm_data), chunk_size):
            output_emitter.push(pcm_data[i:i + chunk_size])

        output_emitter.flush()


class EdgeTTS(TTS):
    """Custom TTS plugin using edge-tts (Microsoft Neural TTS)."""

    def __init__(self, voice: str = "en-US-JennyNeural"):
        super().__init__(
            capabilities=agent_tts.TTSCapabilities(streaming=False),
            sample_rate=SAMPLE_RATE,
            num_channels=NUM_CHANNELS,
        )
        self._voice = voice

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> EdgeTTSChunkedStream:
        return EdgeTTSChunkedStream(tts=self, input_text=text, conn_options=conn_options)

    def stream(self) -> agent_tts.SynthesizeStream:
        raise NotImplementedError("EdgeTTS does not support streaming synthesis")


class EpicVoiceAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=SYSTEM_PROMPT,
        )

    async def on_enter(self):
        await self.session.say(
            "Hello! This is Jenny from EPIC AI. How can I help you today?",
            allow_interruptions=True,
        )


async def entrypoint(ctx: JobContext):
    logger.info("Agent connecting to room: %s", ctx.room.name)
    await ctx.connect()

    session = AgentSession(
        stt=deepgram.STT(
            api_key=DEEPGRAM_API_KEY,
            model="nova-3",
            language="en-US",
        ),
        llm=lk_openai.LLM(
            model=DEEPSEEK_MODEL,
            api_key=DEEPSEEK_API_KEY,
            base_url=DEEPSEEK_BASE_URL,
            max_output_tokens=150,
        ),
        tts=EdgeTTS(voice="en-US-JennyNeural"),
        vad=silero.VAD.load(),
    )

    await session.start(ctx.room, agent=EpicVoiceAgent())


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="epic-voice-agent",
            ws_url="wss://ai-agent-dl6ldsi8.livekit.cloud",
            api_key="APIfFhqC7dRApB2",
            api_secret="U5ln2qZ6BDX1SwYBnla31AgcyhInbSuepNDYPIfhs9V",
        )
    )
