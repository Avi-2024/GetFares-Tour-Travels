import type { IHttpClient } from "../../../shared/interfaces/IHttp.interface";
import { CmsTableCell } from "../models/cms-table-cell.model";
import { CmsTableRow } from "../models/cms-table-row.model";
import type { CmsTableEntry } from "../types/cms-table-entry.type";
import type { JsonRecord } from "../types/json-record.type";
import { CmsRecordAccessor } from "./cms-record-accessor";

class CmsSectionEntryMapper {
  private readonly accessor: CmsRecordAccessor;
  private readonly httpClient: IHttpClient;

  constructor(
    httpClient: IHttpClient,
    accessor: CmsRecordAccessor = new CmsRecordAccessor(),
  ) {
    this.httpClient = httpClient;
    this.accessor = accessor;
  }

  public mapLandingEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");
      const updatedAt = this.accessor.getText(record, "updatedAt", "updated_at");
      const displayOrder =
        this.accessor.getNumber(record, "displayOrder", "display_order") ?? 0;

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          name: new CmsTableCell(this.accessor.getText(record, "title", "name")),
          tag: new CmsTableCell(this.accessor.getText(record, "tag")),
          displayOrder: new CmsTableCell(`#${displayOrder}`),
          isActive: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
          updatedAt: new CmsTableCell(updatedAt),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        restorePath: `${basePath}/${id}/restore`,
        deleteMode: "delete",
        editableField: "name",
        readOnly: false,
      });
    }
    return entries;
  }

  public mapDestinationEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");
      const hasSeo =
        this.accessor.getText(record, "metaTitle", "meta_title") !== "--" &&
        this.accessor.getText(record, "metaDescription", "meta_description") !==
          "--";

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          destination: new CmsTableCell(
            this.accessor.getText(record, "name", "title"),
          ),
          region: new CmsTableCell(this.accessor.getText(record, "region")),
          category: new CmsTableCell(this.accessor.getText(record, "category")),
          seo: new CmsTableCell(
            hasSeo ? "Ready" : "Missing Meta",
            hasSeo ? "success" : "warning",
          ),
          status: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        restorePath: `${basePath}/${id}/restore`,
        deleteMode: "delete",
        editableField: "name",
        readOnly: false,
      });
    }
    return entries;
  }

  public mapPublishedEntries(data: JsonRecord[]): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isPublished = this.accessor.getBoolean(
        record,
        "publishToWebsite",
        "publish_to_website",
      );
      const isSoldOut = this.accessor.getBoolean(record, "isSoldOut", "is_sold_out");
      const statusLabel =
        isSoldOut ? "Sold Out"
        : isPublished ? "Published"
        : "Draft";
      const statusTone =
        isSoldOut ? "warning"
        : isPublished ? "success"
        : "info";

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          package: new CmsTableCell(
            this.accessor.getText(record, "name", "packageName"),
          ),
          destination: new CmsTableCell(this.accessor.getText(record, "destination")),
          price: new CmsTableCell(
            `${this.accessor.getText(
              record,
              "startingPriceCurrency",
              "starting_price_currency",
              "priceCurrency",
              "price_currency",
            )} ${this.accessor.getText(
              record,
              "startingPrice",
              "starting_price",
              "price",
            )}`.trim(),
          ),
          publishState: new CmsTableCell(
            isPublished ? "Published" : "Not Published",
            isPublished ? "success" : "warning",
          ),
          crmState: new CmsTableCell(statusLabel, statusTone),
          syncAt: new CmsTableCell(this.accessor.getText(record, "updatedAt", "updated_at")),
        }),
        updatePath: `/cms/packages/published/${id}`,
        deletePath: `/cms/packages/published/${id}`,
        restorePath: `/cms/packages/published/${id}/restore`,
        deleteMode: "delete",
        editableField: "publishToWebsite",
        readOnly: false,
      });
    }
    return entries;
  }

  public mapMainPackageEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }

      const displayOrder =
        this.accessor.getNumber(record, "displayOrder", "display_order") ?? 0;
      const featured = this.accessor.getBoolean(record, "isFeatured", "is_featured");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          title: new CmsTableCell(
            this.accessor.getText(
              record,
              "title",
              "packageName",
              "package_name",
              "name",
            ),
          ),
          amount: new CmsTableCell(
            this.accessor.getText(record, "amount", "startingPrice", "starting_price"),
          ),
          destination: new CmsTableCell(
            this.accessor.getText(
              record,
              "destination",
              "destinationName",
              "destination_name",
              "destinationId",
              "destination_id",
            ),
          ),
          country: new CmsTableCell(
            this.accessor.getText(record, "country", "destination_country"),
          ),
          displayOrder: new CmsTableCell(`#${displayOrder}`),
          featured: new CmsTableCell(
            featured ? "T" : "F",
            featured ? "success" : "warning",
          ),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        restorePath: `${basePath}/${id}/restore`,
        deleteMode: "delete",
        editableField: "displayOrder",
        readOnly: false,
      });
    }
    return entries;
  }

  public async mapSubPackageEntries(
    mainPath: string,
    country: string | null = null,
    includeDeleted = false,
  ): Promise<CmsTableEntry[]> {
    const options =
      country || includeDeleted ?
        { params: { ...(country ? { country } : {}), ...(includeDeleted ? { includeDeleted: true } : {}) } }
      : undefined;
    const mainPayload = await this.httpClient.get<unknown>(mainPath, options);
    const mainPackages = this.accessor.toArray(mainPayload);
    const entries: CmsTableEntry[] = [];

    for (const mainPackage of mainPackages) {
      const mainId = this.accessor.getId(mainPackage);
      if (!mainId) {
        continue;
      }

      try {
        const subPayload = await this.httpClient.get<unknown>(
          `${mainPath}/${mainId}/sub`,
          options,
        );
        const subPackages = this.accessor.toArray(subPayload);

        for (const subPackage of subPackages) {
          const id = this.accessor.getId(subPackage);
          if (!id) {
            continue;
          }
          const displayOrder =
            this.accessor.getNumber(subPackage, "displayOrder", "display_order") ??
            0;
          entries.push({
            id,
            raw: {
              ...subPackage,
              country: this.accessor.getText(mainPackage, "country", "destination_country") || undefined,
              mainPackageId: mainId,
            },
            row: new CmsTableRow(id, {
              variant: new CmsTableCell(
                this.accessor.getText(subPackage, "title", "packageName", "name"),
              ),
              mainPackage: new CmsTableCell(
                this.accessor.getText(mainPackage, "title", "packageName", "name"),
              ),
              duration: new CmsTableCell(this.accessor.getText(subPackage, "duration")),
              priceBand: new CmsTableCell(
                `${this.accessor.getText(
                  subPackage,
                  "startingPriceCurrency",
                  "starting_price_currency",
                )} ${this.accessor.getText(subPackage, "startingPrice", "starting_price")}`.trim(),
              ),
              displayOrder: new CmsTableCell(`#${displayOrder}`),
              updatedAt: new CmsTableCell(
                this.accessor.getText(subPackage, "updatedAt", "updated_at"),
              ),
            }),
            updatePath: `${mainPath.replace("/main", "/sub")}/${id}`,
            deletePath: `${mainPath.replace("/main", "/sub")}/${id}`,
            restorePath: `${mainPath.replace("/main", "/sub")}/${id}/restore`,
            deleteMode: "delete",
            editableField: "displayOrder",
            readOnly: false,
          });
        }
      } catch {
        // continue with next package
      }
    }
    return entries;
  }

  public mapSubPackageFlatEntries(
    data: JsonRecord[],
    basePath: string,
  ): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const displayOrder =
        this.accessor.getNumber(record, "displayOrder", "display_order") ?? 0;
      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          variant: new CmsTableCell(
            this.accessor.getText(record, "title", "packageName", "name"),
          ),
          mainPackage: new CmsTableCell(
            this.accessor.getText(
              record,
              "mainPackageTitle",
              "main_package_title",
              "mainPackageId",
              "main_package_id",
            ),
          ),
          duration: new CmsTableCell(this.accessor.getText(record, "duration")),
          priceBand: new CmsTableCell(
            `${this.accessor.getText(
              record,
              "startingPriceCurrency",
              "starting_price_currency",
            )} ${this.accessor.getText(record, "startingPrice", "starting_price")}`.trim(),
          ),
          displayOrder: new CmsTableCell(`#${displayOrder}`),
          updatedAt: new CmsTableCell(
            this.accessor.getText(record, "updatedAt", "updated_at"),
          ),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        restorePath: `${basePath}/${id}/restore`,
        deleteMode: "delete",
        editableField: "displayOrder",
        readOnly: false,
      });
    }
    return entries;
  }

  public mapVisaDestinationEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          title: new CmsTableCell(this.accessor.getText(record, "title", "name")),
          country: new CmsTableCell(this.accessor.getText(record, "country")),
          slug: new CmsTableCell(this.accessor.getText(record, "slug")),
          overview: new CmsTableCell(
            this.accessor.getText(record, "overviewTitle", "overview_title"),
          ),
          quickSupport: new CmsTableCell(
            this.accessor.getText(record, "quickSupportTitle", "support_title"),
          ),
          status: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        restorePath: `${basePath}/${id}/restore`,
        deleteMode: "delete",
        editableField: "title",
        readOnly: false,
      });
    }
    return entries;
  }

  public async mapVisaDetailEntries(
    visaBasePath: string,
    country: string | null = null,
    includeDeleted = false,
  ): Promise<CmsTableEntry[]> {
    const options =
      country || includeDeleted ?
        { params: { ...(country ? { country } : {}), ...(includeDeleted ? { includeDeleted: true } : {}) } }
      : undefined;
    const visaPayload = await this.httpClient.get<unknown>(visaBasePath, options);
    const visaDestinations = this.accessor.toArray(visaPayload);
    const entries: CmsTableEntry[] = [];

    for (const destination of visaDestinations) {
      const destinationId = this.accessor.getId(destination);
      if (!destinationId) {
        continue;
      }
      try {
        const detailEntries = await this.mapVisaDetailsForDestination(
          visaBasePath,
          destinationId,
          destination,
          includeDeleted,
        );
        entries.push(...detailEntries);
      } catch {
        // continue with next destination
      }
    }
    return entries;
  }

  public async mapVisaDetailEntriesByDestination(
    visaBasePath: string,
    destinationId: string,
    country: string | null = null,
    includeDeleted = false,
  ): Promise<CmsTableEntry[]> {
    const destinationOptions =
      country || includeDeleted ?
        { params: { ...(country ? { country } : {}), ...(includeDeleted ? { includeDeleted: true } : {}) } }
      : undefined;
    let destinationRecord: JsonRecord | null = null;

    try {
      const destinationPayload = await this.httpClient.get<unknown>(
        `${visaBasePath}/${destinationId}`,
        destinationOptions,
      );
      destinationRecord = this.accessor.toRecord(destinationPayload);
    } catch {
      destinationRecord = null;
    }

    return this.mapVisaDetailsForDestination(
      visaBasePath,
      destinationId,
      destinationRecord ?? { id: destinationId, title: destinationId },
      includeDeleted,
    );
  }

  private async mapVisaDetailsForDestination(
    visaBasePath: string,
    destinationId: string,
    destinationRecord: JsonRecord,
    includeDeleted = false,
  ): Promise<CmsTableEntry[]> {
    const detailsPayload = await this.httpClient.get<unknown>(
      `${visaBasePath}/${destinationId}/details`,
      includeDeleted ? { params: { includeDeleted: true } } : undefined,
    );
    const details = this.accessor.toArray(detailsPayload);
    const destinationLabel = this.accessor.getText(
      destinationRecord,
      "title",
      "name",
      "country",
    );
    const entries: CmsTableEntry[] = [];
    for (const detail of details) {
      const detailId = this.accessor.getId(detail);
      if (!detailId) {
        continue;
      }

      entries.push({
        id: detailId,
        raw: detail,
        row: new CmsTableRow(detailId, {
          destination: new CmsTableCell(destinationLabel),
          sectionType: new CmsTableCell(
            this.accessor.getText(detail, "sectionType", "section_type"),
            "info",
          ),
          label: new CmsTableCell(this.accessor.getText(detail, "label")),
          value: new CmsTableCell(this.accessor.getText(detail, "value")),
          displayOrder: new CmsTableCell(
            `#${
              this.accessor.getNumber(detail, "displayOrder", "display_order") ?? 0
            }`,
          ),
          updatedAt: new CmsTableCell(
            this.accessor.getText(detail, "updatedAt", "updated_at"),
          ),
        }),
        updatePath: `${visaBasePath}/${destinationId}/details/${detailId}`,
        deletePath: `${visaBasePath}/${destinationId}/details/${detailId}`,
        restorePath: `/cms/visa/details/${detailId}/restore`,
        deleteMode: "delete",
        editableField: "value",
        readOnly: false,
      });
    }
    return entries;
  }

  public mapVisaDetailFlatEntries(
    data: JsonRecord[],
    basePath: string,
  ): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const detail of data) {
      const detailId = this.accessor.getId(detail);
      if (!detailId) {
        continue;
      }
      entries.push({
        id: detailId,
        raw: detail,
        row: new CmsTableRow(detailId, {
          destination: new CmsTableCell(
            this.accessor.getText(detail, "visaDestinationId", "visa_destination_id"),
          ),
          sectionType: new CmsTableCell(
            this.accessor.getText(detail, "sectionType", "section_type"),
            "info",
          ),
          label: new CmsTableCell(this.accessor.getText(detail, "label")),
          value: new CmsTableCell(this.accessor.getText(detail, "value")),
          displayOrder: new CmsTableCell(
            `#${
              this.accessor.getNumber(detail, "displayOrder", "display_order") ?? 0
            }`,
          ),
          updatedAt: new CmsTableCell(
            this.accessor.getText(detail, "updatedAt", "updated_at"),
          ),
        }),
        updatePath: `${basePath}/${detailId}`,
        deletePath: `${basePath}/${detailId}`,
        restorePath: `${basePath}/${detailId}/restore`,
        deleteMode: "delete",
        editableField: "value",
        readOnly: false,
      });
    }
    return entries;
  }

  public mapFeaturedEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }

      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");
      const originalPrice = this.accessor.getNumber(
        record,
        "originalPrice",
        "original_price",
      );
      const discountedPrice = this.accessor.getNumber(
        record,
        "discountedPrice",
        "discounted_price",
      );
      const originalOffer =
        originalPrice !== null ?
          `${this.accessor.getText(record, "offerCurrency", "offer_currency")} ${originalPrice}`.trim()
        : this.accessor.getText(record, "originalPrice", "original_price");
      const discountedOffer =
        discountedPrice !== null ?
          `${this.accessor.getText(record, "offerCurrency", "offer_currency")} ${discountedPrice}`.trim()
        : this.accessor.getText(record, "discountedPrice", "discounted_price");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          asset: new CmsTableCell(this.accessor.getText(record, "title", "name")),
          category: new CmsTableCell(this.accessor.getText(record, "category")),
          reference: new CmsTableCell(
            this.accessor.getText(
              record,
              "subtitle",
              "country",
              "referenceId",
              "reference_id",
            ),
          ),
          originalOffer: new CmsTableCell(
            originalOffer === "--" ? "--" : `Original: ${originalOffer}`,
            originalOffer === "--" ? "default" : "warning",
          ),
          discountedOffer: new CmsTableCell(
            discountedOffer === "--" ? "--" : `Discounted: ${discountedOffer}`,
            discountedOffer === "--" ? "default" : "success",
          ),
          badge: new CmsTableCell(
            this.accessor.getText(record, "badgeText", "badge_text"),
          ),
          status: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
        }),
        updatePath: `${basePath}/featured-picks/${id}`,
        deletePath: `${basePath}/featured-picks/${id}`,
        restorePath: `${basePath}/featured-picks/${id}/restore`,
        deleteMode: "delete",
        editableField: "title",
        readOnly: false,
      });
    }
    return entries;
  }

  public mapSeasonCardEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          cluster: new CmsTableCell(
            this.accessor.getText(record, "destinationName", "destination_name"),
          ),
          destinations: new CmsTableCell(this.accessor.getText(record, "title")),
          mainPackages: new CmsTableCell(
            this.accessor.getText(record, "fromMonth", "from_month"),
          ),
          subPackages: new CmsTableCell(
            this.accessor.getText(record, "toMonth", "to_month"),
          ),
          coverage: new CmsTableCell(this.accessor.getText(record, "tag"), "info"),
          status: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
        }),
        updatePath: `${basePath}/season-cards/${id}`,
        deletePath: `${basePath}/season-cards/${id}`,
        restorePath: `${basePath}/season-cards/${id}/restore`,
        deleteMode: "delete",
        editableField: "title",
        readOnly: false,
      });
    }
    return entries;
  }
}

export { CmsSectionEntryMapper };
