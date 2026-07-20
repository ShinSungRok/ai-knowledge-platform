/**
 * Address returned after a successful {@link HttpListener.listen}.
 * `port` is the actual bound port (resolved when config used `0`).
 */
export type HttpListenAddress = {
  host: string;
  port: number;
};
