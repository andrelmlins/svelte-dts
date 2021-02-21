interface ITransformer {
  exec(): void;
  toString(): string;
  appendFile(path: string): Promise<void>;
}

export default ITransformer;
