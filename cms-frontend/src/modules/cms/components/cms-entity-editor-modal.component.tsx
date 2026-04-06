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

interface CmsEntityEditorModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  sectionKey: CmsSectionKey;
  sectionTitle: string;
  entry: CmsTableEntry | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}

interface CmsEntityEditorModalState {
  isBootstrapping: boolean;
  isSubmitting: boolean;
  formValues: Record<string, unknown>;
  formErrors: Record<string, string>;
  relationOptions: Record<RelationSourceKey, CmsFieldOption[]>;
  relationSearch: Record<string, string>;
  mediaItems: CmsEntityMediaEditorItem[];
  removedMediaIds: string[];
  mediaUrlDraft: string;
  mediaTitleDraft: string;
  mediaAltDraft: string;
  mediaErrorMessage: string;
  slugTouched: boolean;
  destinationPackageMapByMainId: Record<string, string>;
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
    formValues: {},
    formErrors: {},
    relationOptions: {
      destinations: [],
      "published-packages": [],
      "main-packages": [],
      "visa-destinations": [],
      "featured-references": [],
    },
    relationSearch: {},
    mediaItems: [],
    removedMediaIds: [],
    mediaUrlDraft: "",
    mediaTitleDraft: "",
    mediaAltDraft: "",
    mediaErrorMessage: "",
    slugTouched: false,
    destinationPackageMapByMainId: {},
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

  private async loadRelationOptions(source: RelationSourceKey): Promise<CmsFieldOption[]> {
    if (source === "featured-references") {
      const [packages, destinations, visa] = await Promise.all([
        this.cmsService.list("published-packages"),
        this.cmsService.list("destinations"),
        this.cmsService.list("visa-destinations"),
      ]);
      return [
        ...packages.map((item) => ({
          value: item.id,
          label: `Package - ${item.row.cells.package?.value ?? item.id}`,
        })),
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

    const sectionMap: Record<Exclude<RelationSourceKey, "featured-references">, CmsSectionKey> = {
      destinations: "destinations",
      "published-packages": "published-packages",
      "main-packages": "main-packages",
      "visa-destinations": "visa-destinations",
    };
    const rows = await this.cmsService.list(sectionMap[source]);
    return rows.map((item) => ({
      value: item.id,
      label:
        item.row.cells.destination?.value ||
        item.row.cells.package?.value ||
        item.row.cells.mainPackage?.value ||
        item.row.cells.country?.value ||
        item.id,
    }));
  }

  private async initialize(): Promise<void> {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    const formValues: Record<string, unknown> = {};
    definition.fields.forEach((field) => {
      if (field.type === "switch") {
        formValues[field.key] = true;
      } else if (field.type === "multi-select") {
        formValues[field.key] = [];
      } else {
        formValues[field.key] = "";
      }
    });

    if (this.props.mode === "edit" && this.props.entry) {
      definition.fields.forEach((field) => {
        const value = this.getRawValue(this.props.entry as CmsTableEntry, field.key);
        if (value === undefined || value === null) {
          return;
        }
        if (field.type === "multi-select") {
          formValues[field.key] =
            Array.isArray(value) ? value.map((item) => String(item))
            : String(value)
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
          return;
        }
        if (field.type === "switch") {
          formValues[field.key] = Boolean(value);
          return;
        }
        formValues[field.key] = String(value);
      });
    }

    this.setState({
      isBootstrapping: true,
      formValues,
      formErrors: {},
      mediaItems: [],
      removedMediaIds: [],
      mediaErrorMessage: "",
      destinationPackageMapByMainId: {},
      slugTouched: false,
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
      nextOptions[source] = await this.loadRelationOptions(source).catch(() => []);
    }

    if (this.props.entry && definition.mediaEnabled) {
      const entityType = this.cmsService.getMediaEntityType(this.props.sectionKey);
      const media = await this.cmsService.listMedia(entityType, this.props.entry.id).catch(() => []);
      const mapped = media.map((item) => ({
        id: item.id,
        clientId: item.id,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
        title: item.title || "",
        altText: item.altText || "",
        isPrimary: item.isPrimary,
      }));
      this.setState({ mediaItems: mapped });
    }

    if (this.props.entry && this.props.sectionKey === "destinations") {
      const mappings = await this.cmsService
        .listDestinationPackages(this.props.entry.id)
        .catch(() => []);
      const byMain: Record<string, string> = {};
      mappings.forEach((item: { mainPackageId: string; id: string }) => {
        byMain[item.mainPackageId] = item.id;
      });
      this.setState((prev) => ({
        destinationPackageMapByMainId: byMain,
        formValues: {
          ...prev.formValues,
          relatedMainPackageIds: mappings.map(
            (item: { mainPackageId: string }) => item.mainPackageId,
          ),
        },
      }));
    }

    this.setState({
      relationOptions: nextOptions,
      isBootstrapping: false,
    });
  }

  private onFieldChange(field: CmsEntityFieldDefinition, nextValue: unknown): void {
    this.setState((prev) => {
      const formValues = { ...prev.formValues, [field.key]: nextValue };
      if (!prev.slugTouched) {
        const slugField = CmsEntityFormCatalog.get(this.props.sectionKey).fields.find(
          (item) => item.autoSlugSource === field.key,
        );
        if (slugField) {
          formValues[slugField.key] = this.slugify(String(nextValue || ""));
        }
      }
      return {
        formValues,
        formErrors: { ...prev.formErrors, [field.key]: "" },
        slugTouched: field.key === "slug" ? true : prev.slugTouched,
      };
    });
  }

  private validate(): boolean {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    const result = this.validator.validate({
      fields: definition.fields,
      formValues: this.state.formValues,
    });
    this.setState({ formErrors: result.errors });
    return result.isValid;
  }

  private createPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    definition.fields.forEach((field) => {
      const value = this.state.formValues[field.key];
      if (field.type === "number") {
        payload[field.key] = String(value ?? "").trim() ? Number(value) : null;
      } else {
        payload[field.key] = value;
      }
    });
    const primary = this.state.mediaItems.find((item) => item.isPrimary) ?? this.state.mediaItems[0];
    if (primary) {
      if (this.props.sectionKey === "landing-places") payload.imageUrl = primary.mediaUrl;
      if (this.props.sectionKey === "destinations") {
        payload.heroImageUrl = primary.mediaUrl;
        payload.thumbnailUrl = primary.thumbnailUrl || primary.mediaUrl;
      }
      if (this.props.sectionKey === "visa-destinations") {
        payload.imageUrl = primary.mediaUrl;
        payload.heroImageUrl = primary.mediaUrl;
      }
      if (this.props.sectionKey === "creative-toolkit") payload.imageUrl = primary.mediaUrl;
      if (this.props.sectionKey === "destination-map") payload.imageUrl = primary.mediaUrl;
    }
    return payload;
  }

  private async syncMedia(entityId: string): Promise<void> {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    if (!definition.mediaEnabled) return;
    const entityType = this.cmsService.getMediaEntityType(this.props.sectionKey);
    for (const mediaId of this.state.removedMediaIds) {
      await this.cmsService.deleteMedia(mediaId);
    }
    for (let index = 0; index < this.state.mediaItems.length; index += 1) {
      const item = this.state.mediaItems[index];
      const payload = {
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
        title: item.title,
        altText: item.altText,
        isPrimary: item.isPrimary,
        displayOrder: index + 1,
      };
      if (item.id) await this.cmsService.updateMedia(item.id, payload);
      else await this.cmsService.createMedia(entityType, entityId, payload);
    }
  }

  private async syncDestinationMappings(destinationId: string): Promise<void> {
    if (this.props.sectionKey !== "destinations") return;
    const selected = Array.isArray(this.state.formValues.relatedMainPackageIds) ?
        (this.state.formValues.relatedMainPackageIds as string[])
      : [];
    const previousMap = this.state.destinationPackageMapByMainId;
    for (const [mainId, mapId] of Object.entries(previousMap)) {
      if (!selected.includes(mainId)) {
        await this.cmsService.unmapDestinationPackage(destinationId, mapId);
      }
    }
    for (let index = 0; index < selected.length; index += 1) {
      const mainId = selected[index];
      if (!previousMap[mainId]) {
        await this.cmsService.mapDestinationPackage(destinationId, mainId, index + 1);
      }
    }
  }

  private onSubmit = async (): Promise<void> => {
    if (!this.validate()) return;
    this.setState({ isSubmitting: true, mediaErrorMessage: "" });
    try {
      const payload = this.createPayload();
      if (this.props.mode === "create") {
        const created = await this.cmsService.create(this.props.sectionKey, payload);
        const entityId =
          (created?.id as string | undefined) ??
          (created?.["id"] as string | undefined) ??
          "";
        if (entityId) {
          await this.syncDestinationMappings(entityId);
          await this.syncMedia(entityId);
        }
        await this.props.onSaved("Record created successfully.");
      } else if (this.props.entry) {
        await this.cmsService.update(this.props.sectionKey, this.props.entry, payload);
        await this.syncDestinationMappings(this.props.entry.id);
        await this.syncMedia(this.props.entry.id);
        await this.props.onSaved("Record updated successfully.");
      }
      this.setState({ isSubmitting: false });
      this.props.onClose();
    } catch (error) {
      this.setState({
        isSubmitting: false,
        mediaErrorMessage: error instanceof Error ? error.message : "Failed to save.",
      });
    }
  };

  private onMediaUrlDraftChange = (value: string): void => {
    this.setState({ mediaUrlDraft: value });
  };

  private onMediaTitleDraftChange = (value: string): void => {
    this.setState({ mediaTitleDraft: value });
  };

  private onMediaAltDraftChange = (value: string): void => {
    this.setState({ mediaAltDraft: value });
  };

  private onAddMedia = (): void => {
    const url = this.state.mediaUrlDraft.trim();
    if (!url) {
      this.setState({ mediaErrorMessage: "Media URL is required." });
      return;
    }

    const item: CmsEntityMediaEditorItem = {
      id: null,
      clientId: this.createClientId(),
      mediaUrl: url,
      thumbnailUrl: url,
      title: this.state.mediaTitleDraft.trim(),
      altText: this.state.mediaAltDraft.trim(),
      isPrimary: this.state.mediaItems.length === 0,
    };

    this.setState((prev) => ({
      mediaItems: [...prev.mediaItems, item],
      mediaUrlDraft: "",
      mediaTitleDraft: "",
      mediaAltDraft: "",
      mediaErrorMessage: "",
    }));
  };

  private onSetCoverMedia = (clientId: string): void => {
    this.setState((prev) => ({
      mediaItems: prev.mediaItems.map((media) => ({
        ...media,
        isPrimary: media.clientId === clientId,
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
    this.setState((prev) => ({
      mediaItems: prev.mediaItems.filter((media) => media.clientId !== item.clientId),
      removedMediaIds: item.id ? [...prev.removedMediaIds, item.id] : prev.removedMediaIds,
    }));
  };

  render() {
    const definition = CmsEntityFormCatalog.get(this.props.sectionKey);
    return (
      <CmsModalShellComponent
        isOpen={this.props.isOpen}
        title={`${this.props.mode === "create" ? "Create" : "Edit"} ${this.props.sectionTitle} Record`}
        description="Structured enterprise form with validated fields and media controls."
        size={this.props.mode === "create" ? definition.createSize : definition.editSize}
        confirmLabel={this.props.mode === "create" ? "Create Record" : "Save Changes"}
        isSubmitting={this.state.isSubmitting}
        confirmDisabled={this.state.isBootstrapping}
        onConfirm={() => void this.onSubmit()}
        onCancel={this.props.onClose}
      >
        <div className="space-y-4">
          <CmsEntityFormGroupsComponent
            definition={definition}
            formValues={this.state.formValues}
            formErrors={this.state.formErrors}
            relationOptions={this.state.relationOptions}
            relationSearch={this.state.relationSearch}
            onFieldChange={this.onFieldChange}
            onRelationSearchChange={(fieldKey, value) =>
              this.setState((prev) => ({
                relationSearch: { ...prev.relationSearch, [fieldKey]: value },
              }))
            }
          />

          {definition.mediaEnabled && (
            <CmsEntityMediaEditorComponent
              mediaItems={this.state.mediaItems}
              mediaUrlDraft={this.state.mediaUrlDraft}
              mediaTitleDraft={this.state.mediaTitleDraft}
              mediaAltDraft={this.state.mediaAltDraft}
              mediaErrorMessage={this.state.mediaErrorMessage}
              onMediaUrlDraftChange={this.onMediaUrlDraftChange}
              onMediaTitleDraftChange={this.onMediaTitleDraftChange}
              onMediaAltDraftChange={this.onMediaAltDraftChange}
              onAddMedia={this.onAddMedia}
              onSetCoverMedia={this.onSetCoverMedia}
              onMoveMediaUp={this.onMoveMediaUp}
              onMoveMediaDown={this.onMoveMediaDown}
              onRemoveMedia={this.onRemoveMedia}
            />
          )}
        </div>
      </CmsModalShellComponent>
    );
  }
}

export default CmsEntityEditorModalComponent;

