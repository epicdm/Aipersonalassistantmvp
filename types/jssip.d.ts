declare module "jssip" {
  export namespace debug {
    function enable(namespaces: string): void;
    function disable(namespaces: string): void;
  }

  export class WebSocketInterface {
    constructor(url: string);
  }

  export class UA {
    constructor(config: {
      sockets: WebSocketInterface[];
      uri: string;
      password?: string;
      display_name?: string;
      register?: boolean;
      [key: string]: unknown;
    });
    start(): void;
    stop(): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, handler: (data?: any) => void): void;
    call(
      target: string,
      options?: {
        mediaConstraints?: { audio: boolean; video: boolean };
        pcConfig?: RTCConfiguration;
        [key: string]: unknown;
      }
    ): RTCSession;
  }

  export class RTCSession {
    connection: RTCPeerConnection;
    remote_identity: {
      display_name?: string;
      uri?: { user?: string };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, handler: (data?: any) => void): void;
    answer(options?: {
      mediaConstraints?: { audio: boolean; video: boolean };
      pcConfig?: RTCConfiguration;
      [key: string]: unknown;
    }): void;
    terminate(options?: { [key: string]: unknown }): void;
    mute(options?: { audio?: boolean; video?: boolean }): void;
    unmute(options?: { audio?: boolean; video?: boolean }): void;
  }

  const JsSIP: {
    debug: typeof debug;
    WebSocketInterface: typeof WebSocketInterface;
    UA: typeof UA;
    RTCSession: typeof RTCSession;
  };

  export default JsSIP;
}
