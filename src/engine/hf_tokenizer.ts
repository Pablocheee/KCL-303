import * as fs from 'fs/promises';

/**
 * Maps bytes 0..255 to unique unicode characters following GPT-2 / Hugging Face ByteLevel BPE standard.
 * This preserves 100% of UTF-8 byte sequences including Russian (Cyrillic), CJK, accents, and emojis.
 */
function bytesToUnicode(): Map<number, string> {
  const map = new Map<number, string>();
  const bs: number[] = [];
  const cs: number[] = [];

  // Printable ASCII ranges + Latin-1 supplement
  for (let b = 33; b <= 126; b++) { bs.push(b); cs.push(b); }
  for (let b = 161; b <= 172; b++) { bs.push(b); cs.push(b); }
  for (let b = 174; b <= 255; b++) { bs.push(b); cs.push(b); }

  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n++;
    }
  }

  for (let i = 0; i < bs.length; i++) {
    map.set(bs[i], String.fromCharCode(cs[i]));
  }
  return map;
}

const BYTE_TO_UNICODE = bytesToUnicode();
const UNICODE_TO_BYTE = new Map<string, number>();
BYTE_TO_UNICODE.forEach((char, byte) => UNICODE_TO_BYTE.set(char, byte));

export class HuggingFaceTokenizer {
  public vocab = new Map<string, number>();
  public idToToken = new Map<number, string>();
  public bpeRanks = new Map<string, number>();
  public addedTokens = new Map<string, number>();
  public addedTokensById = new Map<number, string>();
  public vocabSize: number = 0;

  /**
   * Initializes the tokenizer from a raw tokenizer.json string or parsed JSON object
   */
  public loadFromJson(jsonContent: string | Record<string, any>) {
    const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

    // 1. Parse Vocab
    const vocabObj = data.model?.vocab || data.vocab || {};
    this.vocab.clear();
    this.idToToken.clear();

    for (const [token, id] of Object.entries(vocabObj)) {
      const numId = Number(id);
      this.vocab.set(token, numId);
      this.idToToken.set(numId, token);
    }

    // 2. Parse Added / Special Tokens
    const added = data.added_tokens || [];
    this.addedTokens.clear();
    this.addedTokensById.clear();
    for (const item of added) {
      if (item && item.content !== undefined && item.id !== undefined) {
        this.addedTokens.set(item.content, item.id);
        this.addedTokensById.set(item.id, item.content);
        this.vocab.set(item.content, item.id);
        this.idToToken.set(item.id, item.content);
      }
    }

    // 3. Parse BPE Merges
    const mergesList: string[] = data.model?.merges || data.merges || [];
    this.bpeRanks.clear();

    for (let i = 0; i < mergesList.length; i++) {
      const line = mergesList[i];
      if (typeof line === 'string') {
        const parts = line.trim().split(' ');
        if (parts.length === 2) {
          this.bpeRanks.set(`${parts[0]}\0${parts[1]}`, i);
        }
      }
    }

    this.vocabSize = this.idToToken.size;
  }

  /**
   * Static loader to instantiate directly from a tokenizer.json file on disk
   */
  public static async fromFile(filePath: string): Promise<HuggingFaceTokenizer> {
    const tokenizer = new HuggingFaceTokenizer();
    const content = await fs.readFile(filePath, 'utf-8');
    tokenizer.loadFromJson(content);
    return tokenizer;
  }

  /**
   * Converts UTF-8 string into byte-encoded unicode characters
   */
  private textToByteChars(text: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += BYTE_TO_UNICODE.get(bytes[i]) || '';
    }
    return result;
  }

  /**
   * Applies BPE merges to a sequence of character tokens
   */
  private bpe(token: string): string[] {
    let word = Array.from(token);
    if (word.length <= 1) return word;

    while (word.length > 1) {
      // Find pair with lowest merge rank
      let minRank = Infinity;
      let bestPairIdx = -1;

      for (let i = 0; i < word.length - 1; i++) {
        const key = `${word[i]}\0${word[i + 1]}`;
        const rank = this.bpeRanks.get(key);
        if (rank !== undefined && rank < minRank) {
          minRank = rank;
          bestPairIdx = i;
        }
      }

      if (bestPairIdx === -1) break; // No further merge possible

      // Merge the best pair
      const first = word[bestPairIdx];
      const second = word[bestPairIdx + 1];
      const newWord: string[] = [];

      for (let i = 0; i < word.length; i++) {
        if (i === bestPairIdx) {
          newWord.push(first + second);
          i++; // Skip merged second element
        } else {
          newWord.push(word[i]);
        }
      }

      word = newWord;
    }

    return word;
  }

  /**
   * Encodes raw text (including Cyrillic, English, code, emojis) into token IDs
   */
  public encode(text: string): number[] {
    if (!text) return [];

    // Pre-tokenize words and whitespace
    const regex = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
    const matches = text.match(regex) || [text];
    const tokenIds: number[] = [];

    for (const match of matches) {
      // 1. Check added / special tokens or exact vocabulary match
      if (this.addedTokens.has(match)) {
        tokenIds.push(this.addedTokens.get(match)!);
        continue;
      }
      if (this.vocab.has(match)) {
        tokenIds.push(this.vocab.get(match)!);
        continue;
      }

      // 2. Convert word to byte-level unicode for BPE
      const byteChars = this.textToByteChars(match);

      if (this.vocab.has(byteChars)) {
        tokenIds.push(this.vocab.get(byteChars)!);
        continue;
      }

      // 3. Apply BPE merge algorithm
      const bpeTokens = this.bpe(byteChars.length > 0 ? byteChars : match);

      for (const piece of bpeTokens) {
        if (this.vocab.has(piece)) {
          tokenIds.push(this.vocab.get(piece)!);
        } else {
          // Fallback single character lookup
          for (const char of piece) {
            if (this.vocab.has(char)) {
              tokenIds.push(this.vocab.get(char)!);
            } else if (this.addedTokens.has(char)) {
              tokenIds.push(this.addedTokens.get(char)!);
            }
          }
        }
      }
    }

    return tokenIds;
  }

  /**
   * Decodes an array of token IDs back into standard UTF-8 string
   */
  public decode(tokenIds: number[]): string {
    const byteList: number[] = [];

    for (const id of tokenIds) {
      // Check added / special tokens
      if (this.addedTokensById.has(id)) {
        const specialStr = this.addedTokensById.get(id)!;
        const encodedSpecial = new TextEncoder().encode(specialStr);
        for (let b = 0; b < encodedSpecial.length; b++) byteList.push(encodedSpecial[b]);
        continue;
      }

      const tokenStr = this.idToToken.get(id);
      if (!tokenStr) continue;

      for (const char of tokenStr) {
        if (UNICODE_TO_BYTE.has(char)) {
          byteList.push(UNICODE_TO_BYTE.get(char)!);
        } else {
          // Direct UTF-8 byte conversion fallback
          const bArr = new TextEncoder().encode(char);
          for (let b = 0; b < bArr.length; b++) byteList.push(bArr[b]);
        }
      }
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(new Uint8Array(byteList));
  }

  public getTokenString(id: number): string {
    if (this.addedTokensById.has(id)) return this.addedTokensById.get(id)!;
    const raw = this.idToToken.get(id);
    if (!raw) return `<id_${id}>`;
    return this.decode([id]);
  }
}
