export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseFloat(data);
  }
}

export class ColumnBigIntTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseInt(data, 10);
  }
}
