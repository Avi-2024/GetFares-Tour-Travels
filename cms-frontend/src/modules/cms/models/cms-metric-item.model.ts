import type { CmsMetricTone } from "./cms-metric-tone.type";

class CmsMetricItem {
  public readonly label: string;
  public readonly value: string;
  public readonly change: string;
  public readonly tone: CmsMetricTone;

  constructor(
    label: string,
    value: string,
    change: string,
    tone: CmsMetricTone = "neutral",
  ) {
    this.label = label;
    this.value = value;
    this.change = change;
    this.tone = tone;
  }
}

export { CmsMetricItem };
