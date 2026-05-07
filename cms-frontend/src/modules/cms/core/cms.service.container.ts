import type { ICmsSectionService } from "../interfaces/cms-section.service.interface";
import { CmsSectionService } from "../services/cms-section.service";

class CmsServiceContainer {
  private static sectionService: ICmsSectionService | null = null;

  public static getSectionService(): ICmsSectionService {
    if (!CmsServiceContainer.sectionService) {
      CmsServiceContainer.sectionService = new CmsSectionService();
    }
    return CmsServiceContainer.sectionService;
  }
}

export { CmsServiceContainer };
