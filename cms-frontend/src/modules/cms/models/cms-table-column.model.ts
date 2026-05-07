class CmsTableColumn {
  public readonly key: string;
  public readonly label: string;
  public readonly isHighlighted: boolean;

  constructor(key: string, label: string, isHighlighted = false) {
    this.key = key;
    this.label = label;
    this.isHighlighted = isHighlighted;
  }
}

export { CmsTableColumn };
