class CmsInsightCard {
  public readonly title: string;
  public readonly description: string;
  public readonly bullets: string[];

  constructor(title: string, description: string, bullets: string[]) {
    this.title = title;
    this.description = description;
    this.bullets = bullets;
  }
}

export { CmsInsightCard };
