declare module "pf-sowpods" {
  interface Sowpods {
    verify(word: string): boolean;
    trie: unknown;
    random(count?: number): string | string[];
    length: number;
    [index: number]: string;
  }
  const sowpods: Sowpods;
  export default sowpods;
}
