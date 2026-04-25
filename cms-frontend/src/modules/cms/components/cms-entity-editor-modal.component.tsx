import { Component } from "react";
import CmsModalShellComponent from "./cms-modal-shell.component";
import CmsEntityFormGroupsComponent from "./cms-entity-form-groups.component";
import CmsEntityMediaEditorComponent, {
  type CmsEntityMediaEditorItem,
} from "./cms-entity-media-editor.component";
import type { CmsTableEntry } from "../cms.datasource";
import {
  CmsEntityFormCatalog,
  type CmsEntityFieldDefinition,
  type CmsFieldOption,
  type RelationSourceKey,
} from "../cms-entity-form.catalog";
import type { CmsSectionKey } from "../cms-section.models";
import { CmsServiceContainer } from "../core/cms.service.container";
import { CmsEntityFormValidator } from "../validators/cms-entity-form.validator";
import { ToastService } from "../../../shared/core/toast.service";

interface CmsEntityEditorModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  sectionKey: CmsSectionKey;
  sectionTitle: string;
  entry: CmsTableEntry | null;
  initialValues?: Record<string, unknown>;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}

interface LandingCopy {
  id: number;
  formValues: Record<string, unknown>;
  formErrors: Record<string, string>;
  errorMessage: string;
  imageFile: File | null;
  imagePreview: string;
}

interface CmsEntityEditorModalState {
  isBootstrapping: boolean;
  isSubmitting: boolean;
  isMediaUploading: boolean;
  uploadingFieldKey: string | null;
  formValues: Record<string, unknown>;
  formErrors: Record<string, string>;
  formUploadErrorMessage: string;
  fieldImageFiles: Record<string, File | null>;
  fieldImagePreviews: Record<string, string>;
  relationOptions: Record<RelationSourceKey, CmsFieldOption[]>;
  allDestinations: CmsFieldOption[];
  allMainPackages: CmsFieldOption[];
  mediaItems: CmsEntityMediaEditorItem[];
  removedMediaIds: string[];
  mediaErrorMessage: string;
  mediaInfoMessage: string;
  slugTouched: boolean;
  showDisplayOrderConflict: boolean;
  pendingForcePayload: Record<string, unknown> | null;
  copies: LandingCopy[];
  copyIdCounter: number;
  isCopyAdding: boolean;
}

class CmsEntityEditorModalComponent extends Component<
  CmsEntityEditorModalProps,
  CmsEntityEditorModalState
> {
  private readonly cmsService = CmsServiceContainer.getSectionService();
  private readonly validator = new CmsEntityFormValidator();

  state: CmsEntityEditorModalState = {
    isBootstrapping: false,
    isSubmitting: false,
    isMediaUploading: false,
    uploadingFieldKey: null,
    formValues: {},
    formErrors: {},
    formUploadErrorMessage: "",
    fieldImageFiles: {},
    fieldImagePreviews: {},
    relationOptions: {
      destinations: [],
      "published-packages": [],
      "main-packages": [],
      "visa-destinations": [],
      "featured-references": [],
    },
    allDestinations: [],
    allMainPackages: [],
    mediaItems: [],
    removedMediaIds: [],
    mediaErrorMessage: "",
    mediaInfoMessage: "",
    slugTouched: false,
    showDisplayOrderConflict: false,
    pendingForcePayload: null,
    copies: [],
    copyIdCounter: 0,
    isCopyAdding: false,
  };

  componentDidMount(): void {
    if (this.props.isOpen) {
      void this.initialize();
    }
  }

  componentDidUpdate(prevProps: CmsEntityEditorModalProps): void {
    const shouldReinitialize =
      this.props.isOpen &&
      (!prevProps.isOpen ||
        prevProps.sectionKey !== this.props.sectionKey ||
        prevProps.mode !== this.props.mode ||
        prevProps.entry?.id !== this.props.entry?.id);
    if (shouldReinitialize) {
      void this.initialize();
    }
  }

  componentWillUnmount(): void {
    this.revokeAllPreviewUrls();
  }

  private revokeBlobUrl(url?: string): void {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  private revokeAllPreviewUrls(): void {
    Object.values(this.state.fieldImagePreviews).forEach((url) =>
      this.revokeBlobUrl(url),
    );
    this.state.mediaItems.forEach((item) =>
      this.revokeBlobUrl(item.previewUrl),
    );
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  private createClientId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private toBooleanValue(value: unknown): boolean {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") {
        return true;
      }
      if (
        normalized === "false" ||
        normalized === "0" ||
        normalized.length === 0
      ) {
        return false;
      }
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    return Boolean(value);
  }

  private toDefaultMediaLabel(fileName: string): string {
    const withoutExt = fileName.replace(/\.[^/.]+$/, "");
    return withoutExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  private getMediaKindForFile(file: File): string {
    if (file.type.startsWith("video/")) {
      return "video";
    }
    return "image";
  }

  private toNonEmptyString(value: unknown): string {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim();
  }

  private parseArrayValue(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      const text = value.trim();
      if (!text) {
        return [];
      }
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private normalizeDateInputValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    const text = String(value).trim();
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    const slashMatch = text.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
    if (slashMatch) {
      const [, mm, dd, yyyy] = slashMatch;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return "";
  }

  private mapApiErrorMessage(error: unknown, fallbackMessage: string): string {
    const rawMessage =
      error instanceof Error ? error.message
      : typeof error === "string" ? error
      : fallbackMessage;
    const normalized = String(rawMessage || "").trim();
    if (!normalized) {
      return fallbackMessage;
    }
    if (/unknown column\s+'offer_currency'/i.test(normalized)) {
      return "Schema missing `offer_currency`. Run latest CMS migration and retry.";
    }
    return normalized;
  }

  private getRawValue(entry: CmsTableEntry, key: string): unknown {
    if (entry.raw[key] !== undefined) {
      return entry.raw[key];
    }
    const snake = key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
    if (entry.raw[snake] !== undefined) {
      return entry.raw[snake];
    }
    return undefined;
  }

  private async loadRelationOptions(
    source: RelationSourceKey,
  ): Promise<CmsFieldOption[]> {
    if (source === "featured-references") {
      const [destinations, visa] = await Promise.all([
        // this.cmsService.list("published-packages"),
        this.cmsService.list("destinations"),
        this.cmsService.list("visa-destinations"),
      ]);
      return [
        // ...packages.map((item) => ({
        //   value: item.id,
        //   label: `Package - ${item.row.cells.package?.value ?? item.id}`,
        //   meta: {
        //     destinationName: item.row.cells.destination?.value ?? "",
        //   },
        // })),
        ...destinations.map((item) => ({
          value: item.id,
          label: `Destination - ${item.row.cells.destination?.value ?? item.id}`,
        })),
        ...visa.map((item) => ({
          value: item.id,
          label: `Visa - ${item.row.cells.country?.value ?? item.id}`,
        })),
      ];
    }

    if (
      source === "main-packages" &&
      this.props.sectionKey === "sub-packages"
    ) {
      const rows = await this.cmsService.listAdminMainPackages();
      return rows.map((item) => ({
        value: item.id,
        label:
          item.row.cells.title?.value ||
          item.row.cells.mainPackage?.value ||
          item.id,
        meta: {
          country: String(item.raw.country ?? item.raw.destination_country ?? ""),
        },
      }));
    }

    const sectionMap: Record<
      Exclude<RelationSourceKey, "featured-references">,
      CmsSectionKey
    > = {
      destinations: "destinations",
      "published-packages": "published-packages",
      "main-packages": "main-packages",
      "visa-destinations": "visa-destinations",
    };
    const rows = await this.cmsService.list(sectionMap[source]);
    if (source === "published-packages") {
      return rows.map((item) => ({
        value: item.id,
        label: item.row.cells.package?.value || item.id,
        meta: {
          destinationName: item.row.cells.destination?.value ?? "",
        },
      }));
    }

    if (source === "destinations") {
      return rows.map((item) => ({
        value: item.id,
        label: item.row.cells.destination?.value || item.id,
        meta: {
          country: String(item.raw.country ?? item.raw.destination_country ?? ""),
        },
      }));
    }

    if (source === "main-packages") {
      return rows.map((item) => ({
        value: item.id,
        label:
          item.row.cells.title?.value ||
          item.row.cells.mainPackage?.value ||
          item.id,
        meta: {
          country: String(item.raw.country ?? item.raw.destination_country ?? ""),
        },
      }));
    }

    if (source === "visa-destinations") {
      return rows.map((item) => ({
        value: item.id,
        label: item.row.cells.country?.value || item.id,
      }));
    }

    return rows.map((item) => {
      const titleFallback = this.toNonEmptyString(
        this.getRawValue(item, "title"),
      );
      const slugFallback = this.toNonEmptyString(
        this.getRawValue(item, "slug"),
      );
      return {
        value: item.id,
        label: titleFallback || slugFallback || item.id,
      };
    });
  }

  private async initialize(): Promise<void> {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    const formValues: Record<string, unknown> = {};
    definition.fields.forEach((field) => {
      if (this.props.initialValues && field.key in this.props.initialValues) {
        formValues[field.key] = this.props.initialValues[field.key];
        return;
      }
      if (field.defaultValue !== undefined) {
        formValues[field.key] =
          Array.isArray(field.defaultValue) ?
            [...field.defaultValue]
          : field.defaultValue;
        return;
      }
      if (field.type === "switch") {
        formValues[field.key] = true;
      } else if (field.type === "list-text" || field.type === "list-object") {
        formValues[field.key] = [];
      } else if (field.type === "multi-select") {
        formValues[field.key] = [];
      } else {
        formValues[field.key] = "";
      }
    });

    if (this.props.mode === "edit" && this.props.entry) {
      definition.fields.forEach((field) => {
        let value = this.getRawValue(
          this.props.entry as CmsTableEntry,
          field.key,
        );
        if (
          value === undefined &&
          this.props.sectionKey === "main-packages" &&
          field.key === "title"
        ) {
          value = this.getRawValue(
            this.props.entry as CmsTableEntry,
            "packageName",
          );
          if (value === undefined) {
            value = this.getRawValue(
              this.props.entry as CmsTableEntry,
              "package_name",
            );
          }
          if (value === undefined) {
            value = this.getRawValue(this.props.entry as CmsTableEntry, "name");
          }
        }
        if (
          value === undefined &&
          this.props.sectionKey === "main-packages" &&
          field.key === "amount"
        ) {
          value = this.getRawValue(
            this.props.entry as CmsTableEntry,
            "startingPrice",
          );
          if (value === undefined) {
            value = this.getRawValue(
              this.props.entry as CmsTableEntry,
              "starting_price",
            );
          }
        }
        if (value === undefined && field.key === "categories") {
          value = this.getRawValue(
            this.props.entry as CmsTableEntry,
            "category",
          );
        }
        if (value === undefined && field.key === "seasonFocus") {
          value = this.getRawValue(this.props.entry as CmsTableEntry, "season");
        }
        if (value === undefined || value === null) {
          return;
        }
        if (field.type === "multi-select") {
          formValues[field.key] =
            Array.isArray(value) ?
              value.map((item) => String(item))
            : String(value)
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
          return;
        }
        if (field.type === "switch") {
          formValues[field.key] = this.toBooleanValue(value);
          return;
        }
        if (field.type === "list-text" || field.type === "list-object") {
          formValues[field.key] = this.parseArrayValue(value);
          return;
        }
        if (field.type === "date") {
          formValues[field.key] = this.normalizeDateInputValue(value);
          return;
        }
        formValues[field.key] = String(value);
      });
    }

    this.revokeAllPreviewUrls();

    this.setState({
      isBootstrapping: true,
      isMediaUploading: false,
      uploadingFieldKey: null,
      formValues,
      formErrors: {},
      formUploadErrorMessage: "",
      fieldImageFiles: {},
      fieldImagePreviews: {},
      mediaItems: [],
      removedMediaIds: [],
      mediaErrorMessage: "",
      mediaInfoMessage: "",
      slugTouched: false,
      allDestinations: [],
      allMainPackages: [],
      copies: [],
      copyIdCounter: 0,
      isCopyAdding: false,
    });

    const relationSources = Array.from(
      new Set(
        definition.fields
          .map((field) => field.relationSource)
          .filter((item): item is RelationSourceKey => Boolean(item)),
      ),
    );
    const nextOptions = { ...this.state.relationOptions };
    for (const source of relationSources) {
      nextOptions[source] = await this.loadRelationOptions(source).catch(
        () => [],
      );
    }

    // Store full lists before filtering, then filter by pre-selected country (edit mode)
    const allDestinations = nextOptions.destinations;
    const allMainPackages = nextOptions["main-packages"];
    const currentCountry = String(formValues["country"] ?? "");
    if (currentCountry) {
      if (allDestinations.length > 0) {
        nextOptions.destinations = this.filterByCountry(allDestinations, currentCountry);
      }
      if (allMainPackages.length > 0) {
        nextOptions["main-packages"] = this.filterByCountry(allMainPackages, currentCountry);
      }
    }

    if (this.props.entry && definition.mediaEnabled) {
      const entityType = this.cmsService.getMediaEntityType(
        this.props.sectionKey,
      );
      const media = await this.cmsService
        .listMedia(entityType, this.props.entry.id)
        .catch(() => []);
      if (this.props.sectionKey === "destinations") {
        const rawMedia = this.getRawValue(this.props.entry, "media");
        const mediaRecord =
          rawMedia && typeof rawMedia === "object" && !Array.isArray(rawMedia) ?
            (rawMedia as Record<string, unknown>)
          : {};
        const titleImageUrl = this.toNonEmptyString(
          mediaRecord.title_image ??
            this.getRawValue(this.props.entry, "titleImageUrl") ??
            this.getRawValue(this.props.entry, "thumbnailUrl") ??
            this.getRawValue(this.props.entry, "heroImageUrl"),
        );
        const inlineGallery =
          Array.isArray(mediaRecord.gallery) ?
            mediaRecord.gallery
              .map((item) => this.toNonEmptyString(item))
              .filter((item): item is string => Boolean(item))
          : [];
        const mappedGallery = media
          .filter(
            (item) => this.toNonEmptyString(item.mediaUrl) !== titleImageUrl,
          )
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            clientId: item.id,
            mediaUrl: item.mediaUrl,
            thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
            title: item.title || "",
            altText: item.altText || "",
            isPrimary: false,
            mediaKind: item.mediaKind || "image",
            pendingFile: null,
            previewUrl: undefined,
          }));
        if (!mappedGallery.length && inlineGallery.length) {
          mappedGallery.push(
            ...inlineGallery.slice(0, 4).map((url, index) => ({
              id: "",
              clientId: `destination-gallery-inline-${index}`,
              mediaUrl: url,
              thumbnailUrl: url,
              title: "",
              altText: "",
              isPrimary: false,
              mediaKind: "image" as const,
              pendingFile: null,
              previewUrl: undefined,
            })),
          );
        }
        const primaryItem =
          titleImageUrl ?
            {
              id: "",
              clientId: "destination-title-image",
              mediaUrl: titleImageUrl,
              thumbnailUrl: titleImageUrl,
              title: "Title Image",
              altText: "Title Image",
              isPrimary: true,
              mediaKind: "image" as const,
              pendingFile: null,
              previewUrl: undefined,
            }
          : null;
        this.setState({
          mediaItems:
            primaryItem ? [primaryItem, ...mappedGallery] : mappedGallery,
        });
      } else {
        const mapped = media.map((item) => ({
          id: item.id,
          clientId: item.id,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
          title: item.title || "",
          altText: item.altText || "",
          isPrimary: item.isPrimary,
          mediaKind: item.mediaKind || "image",
          pendingFile: null,
          previewUrl: undefined,
        }));
        this.setState({ mediaItems: mapped });
      }
    }

    this.setState({
      relationOptions: nextOptions,
      allDestinations,
      allMainPackages,
      isBootstrapping: false,
    });
  }

  private filterByCountry(
    options: CmsFieldOption[],
    country: string,
  ): CmsFieldOption[] {
    if (!country) return options;
    return options.filter(
      (option) => String(option.meta?.country ?? "") === country,
    );
  }

  private onFieldChange = (
    field: CmsEntityFieldDefinition,
    nextValue: unknown,
  ): void => {
    this.setState((prev) => {
      const formValues = { ...prev.formValues, [field.key]: nextValue };
      if (!prev.slugTouched) {
        const slugField = CmsEntityFormCatalog.get(
          this.props.sectionKey,
        ).fields.find((item) => item.autoSlugSource === field.key);
        if (slugField) {
          formValues[slugField.key] = this.slugify(String(nextValue || ""));
        }
      }

      let nextRelationOptions = prev.relationOptions;
      if (field.key === "country") {
        const country = String(nextValue ?? "");
        nextRelationOptions = { ...prev.relationOptions };
        if (prev.allDestinations.length > 0) {
          nextRelationOptions.destinations = this.filterByCountry(prev.allDestinations, country);
          formValues["destinationId"] = "";
        }
        if (prev.allMainPackages.length > 0) {
          nextRelationOptions["main-packages"] = this.filterByCountry(prev.allMainPackages, country);
          formValues["mainPackageId"] = "";
        }
      }

      return {
        formValues,
        formErrors: { ...prev.formErrors, [field.key]: "" },
        formUploadErrorMessage: "",
        slugTouched:
          field.key.toLowerCase().includes("slug") ? true : prev.slugTouched,
        relationOptions: nextRelationOptions,
      };
    });
  };

  private onFieldFileUpload = async (
    field: CmsEntityFieldDefinition,
    file: File,
  ): Promise<void> => {
    if (!file.type.startsWith("image/")) {
      this.setState({
        formUploadErrorMessage: "Only image files are supported.",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    this.setState((prev) => {
      this.revokeBlobUrl(prev.fieldImagePreviews[field.key]);
      return {
        uploadingFieldKey: null,
        formUploadErrorMessage: "",
        formErrors: { ...prev.formErrors, [field.key]: "" },
        fieldImageFiles: { ...prev.fieldImageFiles, [field.key]: file },
        fieldImagePreviews: {
          ...prev.fieldImagePreviews,
          [field.key]: previewUrl,
        },
      };
    });
  };

  private onFieldImageClear = (field: CmsEntityFieldDefinition): void => {
    this.setState((prev) => {
      this.revokeBlobUrl(prev.fieldImagePreviews[field.key]);
      const nextFiles = { ...prev.fieldImageFiles };
      const nextPreviews = { ...prev.fieldImagePreviews };
      delete nextFiles[field.key];
      delete nextPreviews[field.key];

      return {
        fieldImageFiles: nextFiles,
        fieldImagePreviews: nextPreviews,
        formValues: { ...prev.formValues, [field.key]: "" },
      };
    });
  };

  private validate(): boolean {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    const result = this.validator.validate({
      fields: definition.fields,
      formValues: this.state.formValues,
      imageFieldFiles: this.state.fieldImageFiles,
    });
    this.setState({ formErrors: result.errors });
    if (!result.isValid) {
      const firstErrorField = definition.fields.find(
        (field) => result.errors[field.key],
      );
      const message = firstErrorField
        ? `Please fill in the "${firstErrorField.label}" field.`
        : "Please fill in all required fields.";
      this.setState({ formUploadErrorMessage: message });
    }
    return result.isValid;
  }

  private validateDestinationMedia(): string | null {
    if (this.props.sectionKey !== "destinations") {
      return null;
    }
    const primary = this.state.mediaItems.find((item) => item.isPrimary);
    if (!primary) {
      return "Title image is required.";
    }
    if ((primary.mediaKind || "image") !== "image") {
      return "Title image must be an image.";
    }
    const galleryCount = this.state.mediaItems.filter(
      (item) => !item.isPrimary,
    ).length;
    if (galleryCount > 4) {
      return "Gallery supports up to 4 items.";
    }
    return null;
  }

  private createPayload(
    mediaItemsOverride?: CmsEntityMediaEditorItem[],
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    definition.fields.forEach((field) => {
      if (
        this.props.sectionKey === "sub-packages" &&
        field.key === "country"
      ) {
        return;
      }
      const value = this.state.formValues[field.key];
      if (field.type === "number" || field.key === "displayOrder") {
        payload[field.key] = String(value ?? "").trim() ? Number(value) : null;
      } else {
        payload[field.key] = value;
      }
    });
    const mediaItems = mediaItemsOverride ?? this.state.mediaItems;
    const primary = mediaItems.find((item) => item.isPrimary) ?? mediaItems[0];
      if (primary) {
        if (this.props.sectionKey === "landing-places")
          payload.imageUrl = primary.mediaUrl;
      if (this.props.sectionKey === "destinations") {
        payload.media = {
          title_image: primary.mediaUrl,
          gallery: mediaItems
            .filter((item) => !item.isPrimary)
            .map((item) => item.mediaUrl)
            .slice(0, 4),
        };
      }
      if (this.props.sectionKey === "visa-destinations") {
        payload.imageUrl = primary.mediaUrl;
        payload.heroImageUrl = primary.mediaUrl;
      }
      if (this.props.sectionKey === "published-packages") {
        payload.bannerImageUrl = primary.mediaUrl;
        payload.galleryImageUrls = mediaItems.map((item) => item.mediaUrl);
      }
      if (this.props.sectionKey === "creative-toolkit")
        payload.imageUrl = primary.mediaUrl;
    }
    return payload;
  }

  private async uploadPendingMediaFiles(): Promise<CmsEntityMediaEditorItem[]> {
    if (!CmsEntityFormCatalog.get(this.props.sectionKey).mediaEnabled) {
      return this.state.mediaItems;
    }

    const pendingItems = this.state.mediaItems.filter(
      (item) => item.pendingFile,
    );
    if (!pendingItems.length) {
      return this.state.mediaItems;
    }

    const nextItems: CmsEntityMediaEditorItem[] = [];
    for (const item of this.state.mediaItems) {
      if (!item.pendingFile) {
        nextItems.push(item);
        continue;
      }

      const uploadedUrl = await this.cmsService.uploadMedia(item.pendingFile);
      this.revokeBlobUrl(item.previewUrl);
      nextItems.push({
        ...item,
        mediaUrl: uploadedUrl,
        thumbnailUrl: uploadedUrl,
        mediaKind: item.mediaKind ?? this.getMediaKindForFile(item.pendingFile),
        pendingFile: null,
        previewUrl: undefined,
      });
    }

    this.setState({ mediaItems: nextItems });
    return nextItems;
  }

  private async uploadPendingFieldImages(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const nextPayload = { ...payload };
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    for (const field of definition.fields) {
      if (field.type !== "url") {
        continue;
      }
      if (!/image|thumbnail|hero|banner/i.test(field.key)) {
        continue;
      }
      const pendingFile = this.state.fieldImageFiles[field.key];
      if (!pendingFile) {
        continue;
      }
      const uploadedUrl = await this.cmsService.uploadMedia(pendingFile);
      nextPayload[field.key] = uploadedUrl;
    }
    return nextPayload;
  }

  private async syncMedia(entityId: string): Promise<void> {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    if (!definition.mediaEnabled) return;
    const entityType = this.cmsService.getMediaEntityType(
      this.props.sectionKey,
    );
    for (const mediaId of this.state.removedMediaIds) {
      await this.cmsService.deleteMedia(mediaId);
    }
    const mediaItemsToSync =
      this.props.sectionKey === "destinations" ?
        this.state.mediaItems.filter((item) => !item.isPrimary)
      : this.state.mediaItems;
    for (let index = 0; index < mediaItemsToSync.length; index += 1) {
      const item = mediaItemsToSync[index];
      let mediaUrl = item.mediaUrl;
      let thumbnailUrl = item.thumbnailUrl || item.mediaUrl;
      const mediaKind = item.mediaKind ?? "image";
      if (item.pendingFile) {
        const uploadedUrl = await this.cmsService.uploadMedia(item.pendingFile);
        mediaUrl = uploadedUrl;
        thumbnailUrl = uploadedUrl;
      }
      const payload = {
        mediaUrl,
        thumbnailUrl,
        title: item.title,
        altText: item.altText,
        isPrimary: item.isPrimary,
        displayOrder: index + 1,
        mediaKind,
      };
      if (item.id) await this.cmsService.updateMedia(item.id, payload);
      else await this.cmsService.createMedia(entityType, entityId, payload);
    }
  }

  private onSubmit = async (): Promise<void> => {
    if (!this.validate()) return;
    const destinationMediaError = this.validateDestinationMedia();
    if (destinationMediaError) {
      this.setState({
        mediaErrorMessage: destinationMediaError,
      });
      return;
    }
    this.setState({ isSubmitting: true, mediaErrorMessage: "" });
    let payload: Record<string, unknown> = {};
    try {
      const uploadedMediaItems = await this.uploadPendingMediaFiles();
      payload = this.createPayload(uploadedMediaItems);
      payload = await this.uploadPendingFieldImages(payload);

      const requiresPrimaryImageOnCreate =
        this.props.mode === "create" &&
        (this.props.sectionKey === "visa-destinations" ||
          this.props.sectionKey === "creative-toolkit");

      if (
        requiresPrimaryImageOnCreate &&
        this.toNonEmptyString(payload.imageUrl).length === 0
      ) {
        this.setState((prev) => ({
          isSubmitting: false,
          mediaErrorMessage: "Primary image is required.",
          formErrors:
            this.props.sectionKey === "visa-destinations" ?
              {
                ...prev.formErrors,
                imageUrl: "Image is required.",
              }
            : prev.formErrors,
        }));
        return;
      }

      if (
        this.props.sectionKey === "published-packages" &&
        this.toBooleanValue(payload.publishToWebsite) &&
        this.toNonEmptyString(payload.websiteSlug).length === 0
      ) {
        this.setState((prev) => ({
          isSubmitting: false,
          formErrors: {
            ...prev.formErrors,
            websiteSlug:
              "Website Slug is required when Publish To Website is enabled.",
          },
        }));
        return;
      }

      if (this.props.mode === "create") {
        if (this.state.copies.length > 0 && !this.validateCopies()) {
          this.setState({ isSubmitting: false });
          return;
        }
        const created = await this.cmsService.create(
          this.props.sectionKey,
          payload,
        );
        const entityId =
          (created?.id as string | undefined) ??
          (created?.["id"] as string | undefined) ??
          "";
        if (entityId) {
          await this.syncMedia(entityId);
        }
        if (this.state.copies.length > 0) {
          await this.submitAllCopies();
        }
        await this.props.onSaved("Record created successfully.");
      } else if (this.props.entry) {
        await this.cmsService.update(
          this.props.sectionKey,
          this.props.entry,
          payload,
        );
        await this.syncMedia(this.props.entry.id);
        await this.props.onSaved("Record updated successfully.");
      }
      this.revokeAllPreviewUrls();
      this.setState({ isSubmitting: false });
      this.props.onClose();
    } catch (error) {
      const message = this.mapApiErrorMessage(error, "Failed to save.");
      const isDisplayOrderConflict =
        message.toLowerCase().includes("display order must be unique") ||
        (error instanceof Error && (error as Error & { code?: string }).code === "DUPLICATE_DISPLAY_ORDER");
      if (isDisplayOrderConflict) {
        this.setState({
          isSubmitting: false,
          showDisplayOrderConflict: true,
          pendingForcePayload: payload,
        });
        return;
      }
      this.setState({
        isSubmitting: false,
        mediaErrorMessage: message,
      });
      ToastService.error(message);
    }
  };

  private onForceDisplayOrder = async (): Promise<void> => {
    const { pendingForcePayload } = this.state;
    if (!pendingForcePayload) return;
    this.setState({ isSubmitting: true, showDisplayOrderConflict: false });
    try {
      const forcePayload = { ...pendingForcePayload, forceDisplayOrder: true };
      if (this.props.mode === "create") {
        const created = await this.cmsService.create(this.props.sectionKey, forcePayload);
        const entityId =
          (created?.id as string | undefined) ??
          (created?.["id"] as string | undefined) ??
          "";
        if (entityId) await this.syncMedia(entityId);
        await this.props.onSaved("Record created successfully.");
      } else if (this.props.entry) {
        await this.cmsService.update(this.props.sectionKey, this.props.entry, forcePayload);
        await this.syncMedia(this.props.entry.id);
        await this.props.onSaved("Record updated successfully.");
      }
      this.revokeAllPreviewUrls();
      this.setState({ isSubmitting: false, pendingForcePayload: null });
      this.props.onClose();
    } catch (error) {
      const message = this.mapApiErrorMessage(error, "Failed to save.");
      this.setState({ isSubmitting: false, mediaErrorMessage: message, pendingForcePayload: null });
      ToastService.error(message);
    }
  };

  private onAddCopy = (): void => {
    this.setState({ isCopyAdding: true });
    setTimeout(() => {
      this.setState((prev) => {
        const existingFile = prev.fieldImageFiles["imageUrl"] ?? null;
        const existingPreview =
          prev.fieldImagePreviews["imageUrl"] ??
          String(prev.formValues.imageUrl ?? "");
        return {
          isCopyAdding: false,
          copies: [
            ...prev.copies,
            {
              id: prev.copyIdCounter + 1,
              formValues: { ...prev.formValues },
              formErrors: {},
              errorMessage: "",
              imageFile: existingFile,
              imagePreview: existingPreview,
            },
          ],
          copyIdCounter: prev.copyIdCounter + 1,
        };
      });
    }, 300);
  };

  private onCopyFieldChange = (
    copyId: number,
    field: CmsEntityFieldDefinition,
    nextValue: unknown,
  ): void => {
    this.setState((prev) => ({
      copies: prev.copies.map((copy) =>
        copy.id !== copyId
          ? copy
          : {
              ...copy,
              formValues: { ...copy.formValues, [field.key]: nextValue },
              formErrors: { ...copy.formErrors, [field.key]: "" },
            },
      ),
    }));
  };

  private onCopyImageUpload = async (
    copyId: number,
    field: CmsEntityFieldDefinition,
    file: File,
  ): Promise<void> => {
    if (!file.type.startsWith("image/")) return;
    const previewUrl = URL.createObjectURL(file);
    this.setState((prev) => ({
      copies: prev.copies.map((copy) =>
        copy.id !== copyId
          ? copy
          : {
              ...copy,
              imageFile: file,
              imagePreview: previewUrl,
              formValues: { ...copy.formValues, [field.key]: previewUrl },
              formErrors: { ...copy.formErrors, [field.key]: "" },
            },
      ),
    }));
  };

  private onCopyImageClear = (
    copyId: number,
    field: CmsEntityFieldDefinition,
  ): void => {
    this.setState((prev) => ({
      copies: prev.copies.map((copy) =>
        copy.id !== copyId
          ? copy
          : {
              ...copy,
              imageFile: null,
              imagePreview: "",
              formValues: { ...copy.formValues, [field.key]: "" },
            },
      ),
    }));
  };

  private onRemoveCopy = (copyId: number): void => {
    this.setState((prev) => ({
      copies: prev.copies.filter((copy) => copy.id !== copyId),
    }));
  };

  private validateCopies(): boolean {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    let allValid = true;
    const updatedCopies = this.state.copies.map((copy) => {
      const result = this.validator.validate({
        fields: definition.fields,
        formValues: copy.formValues,
        imageFieldFiles: copy.imageFile ? { imageUrl: copy.imageFile } : {},
      });
      if (!result.isValid) {
        allValid = false;
        const firstError = definition.fields.find((f) => result.errors[f.key]);
        return {
          ...copy,
          formErrors: result.errors,
          errorMessage: firstError
            ? `Please fill in the "${firstError.label}" field.`
            : "Please fill in all required fields.",
        };
      }
      return { ...copy, formErrors: {}, errorMessage: "" };
    });
    this.setState({ copies: updatedCopies });
    return allValid;
  }

  private async submitAllCopies(): Promise<void> {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    for (const copy of this.state.copies) {
      const payload: Record<string, unknown> = {};
      definition.fields.forEach((field) => {
        const value = copy.formValues[field.key];
        payload[field.key] =
          field.type === "number" || field.key === "displayOrder"
            ? String(value ?? "").trim() ? Number(value) : null
            : value;
      });
      // upload pending image file if present
      if (copy.imageFile) {
        const uploadedUrl = await this.cmsService.uploadMedia(copy.imageFile);
        payload.imageUrl = uploadedUrl;
      }
      await this.cmsService.create(this.props.sectionKey, payload);
    }
  }

  private onUploadMedia = async (file: File): Promise<void> => {
    const allowVideo = this.props.sectionKey === "destinations";
    if (
      !file.type.startsWith("image/") &&
      !(allowVideo && file.type.startsWith("video/"))
    ) {
      const message =
        allowVideo ?
          "Only image or video files are supported."
        : "Only image files are supported.";
      this.setState({
        mediaErrorMessage: message,
        mediaInfoMessage: "",
      });
      ToastService.error(message);
      return;
    }

    if (
      this.props.sectionKey === "destinations" &&
      this.state.mediaItems.length >= 5
    ) {
      const message = "Only 4 gallery items allowed.";
      this.setState({
        mediaErrorMessage: message,
        mediaInfoMessage: "",
      });
      ToastService.warning(message);
      return;
    }

    this.setState({
      isMediaUploading: true,
      mediaErrorMessage: "",
      mediaInfoMessage: "",
    });

    try {
      const defaultLabel = this.toDefaultMediaLabel(file.name);
      const previewUrl = URL.createObjectURL(file);

      const mediaKind = this.getMediaKindForFile(file);
      this.setState((prev) => ({
        isMediaUploading: false,
        mediaItems: [
          ...prev.mediaItems,
          {
            id: null,
            clientId: this.createClientId(),
            mediaUrl: previewUrl,
            thumbnailUrl: previewUrl,
            title: defaultLabel,
            altText: defaultLabel,
            isPrimary:
              this.props.sectionKey === "destinations" ?
                mediaKind === "image" &&
                prev.mediaItems.every((item) => !item.isPrimary)
              : prev.mediaItems.length === 0,
            mediaKind,
            pendingFile: file,
            previewUrl,
          },
        ],
        mediaErrorMessage: "",
        mediaInfoMessage: `${file.name} selected. Upload on save.`,
      }));
      ToastService.success("Media selected. Upload on save.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Media selection failed.";
      this.setState({
        isMediaUploading: false,
        mediaInfoMessage: "",
        mediaErrorMessage: message,
      });
      ToastService.error(message);
    }
  };

  private onSetCoverMedia = (clientId: string): void => {
    this.setState((prev) => ({
      mediaItems: prev.mediaItems.map((media) => ({
        ...media,
        isPrimary:
          (
            this.props.sectionKey === "destinations" &&
            media.mediaKind === "video"
          ) ?
            media.isPrimary
          : media.clientId === clientId,
      })),
    }));
  };

  private onMoveMediaUp = (index: number): void => {
    if (index <= 0) {
      return;
    }
    this.setState((prev) => {
      const next = [...prev.mediaItems];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return { mediaItems: next };
    });
  };

  private onMoveMediaDown = (index: number): void => {
    this.setState((prev) => {
      if (index >= prev.mediaItems.length - 1) {
        return null;
      }
      const next = [...prev.mediaItems];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return { mediaItems: next };
    });
  };

  private onRemoveMedia = (item: CmsEntityMediaEditorItem): void => {
    this.revokeBlobUrl(item.previewUrl);
    this.setState((prev) => ({
      mediaItems: prev.mediaItems.filter(
        (media) => media.clientId !== item.clientId,
      ),
      removedMediaIds:
        item.id ? [...prev.removedMediaIds, item.id] : prev.removedMediaIds,
    }));
  };

  private onUploadDestinationTitleImage = async (file: File): Promise<void> => {
    if (!file.type.startsWith("image/")) {
      const message = "Title image must be an image file.";
      this.setState({
        mediaErrorMessage: message,
        mediaInfoMessage: "",
      });
      ToastService.error(message);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const defaultLabel = this.toDefaultMediaLabel(file.name);

    this.setState((prev) => {
      const nextItems = [...prev.mediaItems];
      const primaryIndex = nextItems.findIndex((item) => item.isPrimary);
      if (primaryIndex >= 0) {
        this.revokeBlobUrl(nextItems[primaryIndex].previewUrl);
        nextItems[primaryIndex] = {
          ...nextItems[primaryIndex],
          mediaUrl: previewUrl,
          thumbnailUrl: previewUrl,
          title: defaultLabel,
          altText: defaultLabel,
          mediaKind: "image",
          pendingFile: file,
          previewUrl,
          isPrimary: true,
        };
      } else {
        nextItems.unshift({
          id: null,
          clientId: this.createClientId(),
          mediaUrl: previewUrl,
          thumbnailUrl: previewUrl,
          title: defaultLabel,
          altText: defaultLabel,
          isPrimary: true,
          mediaKind: "image",
          pendingFile: file,
          previewUrl,
        });
      }
      return {
        mediaItems: nextItems,
        mediaErrorMessage: "",
        mediaInfoMessage: `${file.name} selected. Upload on save.`,
      };
    });
    ToastService.success("Title image selected. Upload on save.");
  };

  private onUploadDestinationGalleryMedia = async (
    file: File,
  ): Promise<void> => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      const message = "Only image or video files are supported.";
      this.setState({
        mediaErrorMessage: message,
        mediaInfoMessage: "",
      });
      ToastService.error(message);
      return;
    }

    const galleryCount = this.state.mediaItems.filter(
      (item) => !item.isPrimary,
    ).length;
    if (galleryCount >= 4) {
      const message = "Only 4 gallery items allowed.";
      this.setState({
        mediaErrorMessage: message,
        mediaInfoMessage: "",
      });
      ToastService.warning(message);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const defaultLabel = this.toDefaultMediaLabel(file.name);
    const mediaKind = this.getMediaKindForFile(file);

    this.setState((prev) => ({
      mediaItems: [
        ...prev.mediaItems,
        {
          id: null,
          clientId: this.createClientId(),
          mediaUrl: previewUrl,
          thumbnailUrl: previewUrl,
          title: defaultLabel,
          altText: defaultLabel,
          isPrimary: false,
          mediaKind,
          pendingFile: file,
          previewUrl,
        },
      ],
      mediaErrorMessage: "",
      mediaInfoMessage: `${file.name} selected. Upload on save.`,
    }));
    ToastService.success("Gallery media selected. Upload on save.");
  };

  private moveDestinationGalleryItem(index: number, direction: -1 | 1): void {
    this.setState((prev) => {
      const primary = prev.mediaItems.filter((item) => item.isPrimary);
      const gallery = prev.mediaItems.filter((item) => !item.isPrimary);
      const target = index + direction;
      if (target < 0 || target >= gallery.length) {
        return null;
      }
      const nextGallery = [...gallery];
      const temp = nextGallery[target];
      nextGallery[target] = nextGallery[index];
      nextGallery[index] = temp;
      return { mediaItems: [...primary, ...nextGallery] };
    });
  }

  private renderDestinationMediaSection() {
    const primary =
      this.state.mediaItems.find((item) => item.isPrimary) || null;
    const gallery = this.state.mediaItems.filter((item) => !item.isPrimary);

    return (
      <section className="rounded-2xl border border-[var(--border)] bg-(--surface) p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          Media
        </h4>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_1.95fr]">
          <div className="rounded-2xl border border-[var(--border)] bg-(--surface) p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Title Image
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  1 image
                </p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[11px] font-semibold text-[var(--text-primary)] transition hover:bg-(--background-soft)">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void this.onUploadDestinationTitleImage(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-(--background-soft)">
              {primary ?
                <img
                  src={primary.thumbnailUrl || primary.mediaUrl}
                  alt={primary.altText || primary.title || "Title image"}
                  className="h-32 w-full object-cover"
                />
              : <div className="flex h-32 items-center justify-center text-xs text-[var(--text-secondary)]">
                  No title image selected.
                </div>
              }
            </div>
            {primary && (
              <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>
                  {primary.pendingFile ? "Pending upload" : "Uploaded"}
                </span>
                <button
                  type="button"
                  onClick={() => this.onRemoveMedia(primary)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] px-2 py-1 text-[var(--danger)]"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-(--surface) p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Gallery
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Up to 4 images or videos
                </p>
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[11px] font-semibold text-[var(--text-primary)] transition hover:bg-(--background-soft)">
                Add Media
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void this.onUploadDestinationGalleryMedia(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {gallery.map((item, index) => (
                <div
                  key={item.clientId}
                  className="rounded-2xl border border-[var(--border)] p-2"
                >
                  {item.mediaKind === "video" ?
                    <video
                      src={item.mediaUrl}
                      className="h-24 w-full rounded-xl object-cover"
                      muted
                      playsInline
                    />
                  : <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.altText || item.title || "Gallery"}
                      className="h-24 w-full rounded-xl object-cover"
                    />
                  }
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>#{index + 1}</span>
                    <span>
                      {item.mediaKind === "video" ? "Video" : "Image"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => this.moveDestinationGalleryItem(index, -1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => this.moveDestinationGalleryItem(index, 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => this.onRemoveMedia(item)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] text-[var(--danger)]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  render() {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    const isCopySupported =
      this.props.sectionKey === "landing-places" ||
      this.props.sectionKey === "destinations" ||
      this.props.sectionKey === "main-packages" ||
      this.props.sectionKey === "sub-packages" ||
      this.props.sectionKey === "visa-destinations" ||
      this.props.sectionKey === "creative-toolkit";
    const isLandingCreate = isCopySupported && this.props.mode === "create";
    return (
      <>
        <CmsModalShellComponent
          isOpen={this.props.isOpen}
          title={`${this.props.mode === "create" ? "Create" : "Edit"} ${this.props.sectionTitle} Record`}
          description="Structured enterprise form with validated fields and media controls."
          size={
            this.props.mode === "create" ?
              definition.createSize
            : definition.editSize
          }
          confirmLabel={
            this.props.mode === "create" ? "Create Record" : "Save Changes"
          }
          isSubmitting={this.state.isSubmitting}
          confirmDisabled={
            this.state.isBootstrapping ||
            this.state.isMediaUploading ||
            Boolean(this.state.uploadingFieldKey)
          }
          onConfirm={() => void this.onSubmit()}
          onCancel={this.props.onClose}
        >
          <div className="space-y-4">
            {this.state.formUploadErrorMessage && (
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--danger)]">
                {this.state.formUploadErrorMessage}
              </div>
            )}
            <CmsEntityFormGroupsComponent
              definition={definition}
              formValues={this.state.formValues}
              formErrors={this.state.formErrors}
              imageFieldPreviews={this.state.fieldImagePreviews}
              relationOptions={this.state.relationOptions}
              onFieldChange={this.onFieldChange}
              onFieldFileUpload={this.onFieldFileUpload}
              onFieldImageClear={this.onFieldImageClear}
              uploadingFieldKey={this.state.uploadingFieldKey}
            />

            {definition.mediaEnabled &&
              (this.props.sectionKey === "destinations" ?
                this.renderDestinationMediaSection()
              : <CmsEntityMediaEditorComponent
                  mediaItems={this.state.mediaItems}
                  mediaErrorMessage={this.state.mediaErrorMessage}
                  mediaInfoMessage={this.state.mediaInfoMessage}
                  isMediaUploading={this.state.isMediaUploading}
                  onUploadMedia={this.onUploadMedia}
                  onSetCoverMedia={this.onSetCoverMedia}
                  onMoveMediaUp={this.onMoveMediaUp}
                  onMoveMediaDown={this.onMoveMediaDown}
                  onRemoveMedia={this.onRemoveMedia}
                />)}

            {isCopySupported && (
              <div className="flex justify-end border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  onClick={this.onAddCopy}
                  disabled={this.state.isSubmitting || this.state.isCopyAdding}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-(--background-soft) disabled:opacity-60"
                >
                  {this.state.isCopyAdding ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--text-secondary)] border-t-transparent" />
                  ) : (
                    <span>⧉</span>
                  )}
                  {this.state.isCopyAdding ? "Copying..." : "Copy Fields"}
                </button>
              </div>
            )}

            {isCopySupported && this.state.copies.map((copy, index) => (
              <div
                key={copy.id}
                className="rounded-2xl border border-[var(--border)] bg-(--surface) p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                    Copy #{index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => this.onRemoveCopy(copy.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] text-xs text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
                  >
                    ✕
                  </button>
                </div>

                {copy.errorMessage && (
                  <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--danger)]">
                    {copy.errorMessage}
                  </div>
                )}

                <CmsEntityFormGroupsComponent
                  definition={definition}
                  formValues={copy.formValues}
                  formErrors={copy.formErrors}
                  imageFieldPreviews={{ imageUrl: copy.imagePreview }}
                  relationOptions={this.state.relationOptions}
                  onFieldChange={(field, value) =>
                    this.onCopyFieldChange(copy.id, field, value)
                  }
                  onFieldFileUpload={(field, file) =>
                    this.onCopyImageUpload(copy.id, field, file)
                  }
                  onFieldImageClear={(field) =>
                    this.onCopyImageClear(copy.id, field)
                  }
                />
              </div>
            ))}
          </div>
        </CmsModalShellComponent>

        {this.state.showDisplayOrderConflict && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-(--surface) p-6 shadow-xl">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Display Order Conflict
              </h3>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                This display order is already taken by another landing place. Do
                you want to replace it?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    this.setState({
                      showDisplayOrderConflict: false,
                      pendingForcePayload: null,
                    })
                  }
                  className="modal-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void this.onForceDisplayOrder()}
                  className="modal-btn-primary"
                >
                  Yes, Replace
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
}

export default CmsEntityEditorModalComponent;
