class CmsUploadBox {
  public readonly title: string;
  public readonly hint: string;
  public readonly buttonLabel: string;

  constructor(title: string, hint: string, buttonLabel: string) {
    this.title = title;
    this.hint = hint;
    this.buttonLabel = buttonLabel;
  }
}

export { CmsUploadBox };
