interface ITransformer {
  exec(): void;
  toString(): string | Promise<string>;
  appendFile(path: string): Promise<void>;
}

export default ITransformer;
