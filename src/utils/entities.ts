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

export class ColumnDateTransformer {
  to(data: Date | string): string {
    return (typeof data !== 'string' ? data.toISOString() : data).replace(
      'Z',
      '',
    );
  }
  from(value: string | Date): Date {
    return typeof value === 'string'
      ? new Date(value.indexOf('Z') !== -1 ? value : value + 'Z')
      : value;
  }
}
