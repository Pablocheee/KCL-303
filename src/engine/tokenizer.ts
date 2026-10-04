/**
 * Lightweight Zero-Dependency Byte-Pair / Subword Tokenizer Stub
 * 
 * Supports full ASCII / UTF-8 fallback with common English subwords,
 * special tokens (<pad>, <bos>, <eos>, <unk>), and bi-directional encode/decode.
 */

export interface TokenizerVocab {
  tokenToId: Map<string, number>;
  idToToken: Map<number, string>;
  vocabSize: number;
}

// Curated vocabulary for demonstration with subword tokens and byte fallbacks
const BASE_SUBWORDS: string[] = [
  '<pad>', '<bos>', '<eos>', '<unk>',
  ' ', 't', 'e', 'a', 'o', 'i', 'n', 's', 'h', 'r', 'd', 'l', 'c', 'u', 'm', 'w', 'f', 'g', 'y', 'p', 'b', 'v', 'k', 'j', 'x', 'q', 'z',
  'T', 'E', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B', 'V', 'K', 'J', 'X', 'Q', 'Z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ',', '!', '?', ':', ';', '-', '_', '/', '(', ')', '"', "'", '\n',
  'th', 'he', 'in', 'er', 'an', 're', 'ed', 'on', 'es', 'st', 'en', 'at', 'to', 'nt', 'ha', 'nd', 'ou', 'ea', 'ng', 'as', 'or', 'ti', 'is', 'et', 'it',
  ' the', ' and', ' to', ' of', ' a', ' in', ' is', ' it', ' you', ' that', ' he', ' was', ' for', ' on', ' are', ' with', ' as', ' I', ' his', ' they',
  ' be', ' at', ' one', ' have', ' this', ' from', ' or', ' had', ' by', ' hot', ' but', ' some', ' what', ' there', ' we', ' can', ' out', ' other',
  ' were', ' all', ' your', ' when', ' up', ' use', ' word', ' how', ' said', ' an', ' each', ' she', ' which', ' do', ' their', ' time', ' if',
  ' will', ' way', ' about', ' many', ' then', ' them', ' write', ' would', ' like', ' so', ' these', ' her', ' long', ' make', ' thing', ' see',
  ' him', ' two', ' has', ' look', ' more', ' day', ' could', ' go', ' come', ' did', ' number', ' sound', ' no', ' most', ' people', ' my', ' over',
  ' know', ' water', ' than', ' call', ' first', ' who', ' may', ' down', ' side', ' been', ' now', ' find', ' any', ' new', ' work', ' part', ' take',
  ' get', ' place', ' made', ' live', ' where', ' after', ' back', ' little', ' only', ' round', ' man', ' year', ' came', ' show', ' every', ' good',
  ' me', ' give', ' our', ' under', ' name', ' very', ' through', ' just', ' form', ' sentence', ' great', ' think', ' say', ' help', ' low', ' line',
  ' differ', ' turn', ' cause', ' much', ' mean', ' before', ' move', ' right', ' boy', ' old', ' too', ' same', ' tell', ' does', ' set', ' three',
  ' want', ' air', ' well', ' also', ' play', ' small', ' end', ' put', ' home', ' read', ' hand', ' port', ' large', ' spell', ' add', ' even', ' land',
  ' here', ' must', ' big', ' high', ' such', ' follow', ' act', ' why', ' ask', ' men', ' change', ' went', ' light', ' kind', ' off', ' need', ' house',
  ' picture', ' try', ' us', ' again', ' animal', ' point', ' mother', ' world', ' near', ' build', ' self', ' earth', ' father', ' head', ' stand', ' own',
  ' page', ' should', ' country', ' found', ' answer', ' school', ' grow', ' study', ' still', ' learn', ' plant', ' cover', ' food', ' sun', ' four',
  ' thought', ' let', ' keep', ' eye', ' never', ' last', ' door', ' between', ' city', ' tree', ' cross', ' since', ' hard', ' start', ' might', ' story',
  ' saw', ' far', ' sea', ' draw', ' left', ' late', ' run', "don't", ' while', ' press', ' close', ' night', ' real', ' life', ' few', ' stop',
  // Domain terms for AI / BitNet
  'BitNet', 'ternary', 'weight', 'neural', 'network', 'inference', 'RAM', 'disk', 'memory', 'LLM', 'transformer', 'attention', 'zero', 'Intel', 'i5', 'MacBook', 'speed', 'model'
];

export class SimpleBPETokenizer {
  private tokenToId = new Map<string, number>();
  private idToToken = new Map<number, string>();
  public readonly vocabSize: number;

  constructor() {
    // Fill vocab with unique subwords up to power of 2 (e.g. 512 for our compact LLM)
    let id = 0;
    for (const token of BASE_SUBWORDS) {
      if (!this.tokenToId.has(token)) {
        this.tokenToId.set(token, id);
        this.idToToken.set(id, token);
        id++;
      }
    }

    // Pad vocabulary up to 512 entries with single byte hex codes if needed
    for (let b = 0; b < 256; b++) {
      const char = String.fromCharCode(b);
      if (!this.tokenToId.has(char)) {
        this.tokenToId.set(char, id);
        this.idToToken.set(id, char);
        id++;
      }
      if (id >= 512) break;
    }

    // Add extra padding tokens up to fixed vocab size of 512
    while (id < 512) {
      const extraToken = `<extra_id_${id}>`;
      this.tokenToId.set(extraToken, id);
      this.idToToken.set(id, extraToken);
      id++;
    }

    this.vocabSize = 512;
  }

  /**
   * Encodes a string into an array of token IDs using greedy longest-match subword tokenization.
   */
  public encode(text: string): number[] {
    if (!text) return [];
    const tokens: number[] = [];
    let i = 0;

    while (i < text.length) {
      let matched = false;
      // Try longest match from current position (max subword length ~16)
      const maxLen = Math.min(16, text.length - i);

      for (let len = maxLen; len >= 1; len--) {
        const sub = text.slice(i, i + len);
        if (this.tokenToId.has(sub)) {
          tokens.push(this.tokenToId.get(sub)!);
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Fallback to single character / byte
        const char = text[i];
        if (this.tokenToId.has(char)) {
          tokens.push(this.tokenToId.get(char)!);
        } else {
          // Unknown token fallback (ID 3 = <unk>)
          tokens.push(3);
        }
        i++;
      }
    }

    return tokens;
  }

  /**
   * Decodes an array of token IDs back into a reconstructed string.
   */
  public decode(tokens: number[]): string {
    return tokens
      .map((id) => {
        if (id === 0 || id === 1 || id === 2) return ''; // <pad>, <bos>, <eos>
        if (id === 3) return ''; // <unk>
        return this.idToToken.get(id) ?? '';
      })
      .join('');
  }

  public getTokenString(id: number): string {
    return this.idToToken.get(id) ?? `<id_${id}>`;
  }
}

export const defaultTokenizer = new SimpleBPETokenizer();
