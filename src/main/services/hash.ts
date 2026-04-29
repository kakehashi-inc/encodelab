import { createHash } from 'crypto';
import type { HashAlgorithm, HashEncoding } from '../../shared/types';

const NODE_ALGO: Record<HashAlgorithm, string> = {
    md5: 'md5',
    sha1: 'sha1',
    sha256: 'sha256',
    sha512: 'sha512',
};

export function computeHash(algorithm: HashAlgorithm, encoding: HashEncoding, bytes: Uint8Array): string {
    const hash = createHash(NODE_ALGO[algorithm]);
    hash.update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    return hash.digest(encoding);
}
