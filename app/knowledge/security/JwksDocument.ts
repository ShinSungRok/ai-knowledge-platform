/**
 * RSA public key entry from a JWKS document.
 */
export type JwkRsaPublicKey = {
  kid?: string;
  kty: "RSA";
  n: string;
  e: string;
  alg?: string;
  use?: string;
};

/**
 * JWKS document shape (`keys` array).
 */
export type JwksDocument = {
  keys: JwkRsaPublicKey[];
};
