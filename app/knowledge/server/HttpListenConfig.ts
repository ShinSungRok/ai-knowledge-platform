/**
 * Configuration for opening a TCP HTTP listener.
 * `port: 0` requests an ephemeral OS-assigned port.
 */
export type HttpListenConfig = {
  host: string;
  port: number;
};
