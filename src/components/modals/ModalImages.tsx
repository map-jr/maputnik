import React from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import { MdDelete } from "react-icons/md";

import { Modal } from "./Modal";
import { FieldString } from "../FieldString";
import { InputButton } from "../InputButton";
import { type OnStyleChangedCallback, type StyleSpecificationWithId } from "../../libs/definitions";
import {
  isSvg,
  MAX_IMAGE_LENGTH,
  removeStyleImage,
  setStyleImage,
  styleImages,
  styleImageText,
} from "../../libs/style-images";

/** A preview of an image: an SVG document as a data URL, a URL as it is. An <img> runs no script of the SVG. */
function previewUrl(text: string | undefined): string | undefined {
  if (!text) return undefined;
  if (isSvg(text)) return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
  if (/^https?:\/\//.test(text)) return text;
  return undefined;
}

type ModalImagesInternalProps = {
  mapStyle: StyleSpecificationWithId
  isOpen: boolean
  onOpenToggle(): void
  onStyleChanged: OnStyleChangedCallback
} & WithTranslation;

const ModalImagesInternal: React.FC<ModalImagesInternalProps> = (props) => {
  const { t, mapStyle } = props;
  const [newName, setNewName] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);

  /** Reads an SVG file, checks it, and passes its text on. */
  const readSvg = async (file: File | undefined, use: (text: string) => void) => {
    if (!file) return;
    const text = await file.text();
    if (!isSvg(text)) {
      setError(t("The file \"{{file}}\" is not an SVG document.", { file: file.name }));
      return;
    }
    if (text.length > MAX_IMAGE_LENGTH) {
      setError(t("The file \"{{file}}\" has {{length}} characters. Map Jr. GL takes an image of at most {{max}} characters.", {
        file: file.name, length: text.length, max: MAX_IMAGE_LENGTH,
      }));
      return;
    }
    setError(undefined);
    use(text);
  };

  const onAdd = (file: File | undefined) => readSvg(file, text => {
    const name = newName.trim() || file!.name.replace(/\.svg$/i, "");
    if (styleImages(mapStyle).some(image => image.name === name)) {
      setError(t("The style has an image \"{{name}}\". Choose another name, or replace that image.", { name }));
      return;
    }
    setNewName("");
    props.onStyleChanged(setStyleImage(mapStyle, name, text));
  });

  const onReplace = (name: string, file: File | undefined) => readSvg(file, text => {
    props.onStyleChanged(setStyleImage(mapStyle, name, text));
  });

  const images = styleImages(mapStyle).map(({ name, slots }) => {
    const src = previewUrl(styleImageText(mapStyle, name));
    return <div key={name} className="maputnik-style-image" data-wd-key={"modal:images.image:" + name}>
      <div className="maputnik-style-image-header">
        <span className="maputnik-style-image-header-name">{name}</span>
        <span className="maputnik-space" />
        <InputButton
          aria-label={t("Remove image '{{name}}'", { name })}
          className="maputnik-style-image-header-delete"
          onClick={() => props.onStyleChanged(removeStyleImage(mapStyle, name))}
          style={{ backgroundColor: "transparent" }}
          data-wd-key={"modal:images.remove:" + name}
        >
          <MdDelete />
        </InputButton>
      </div>
      <div className="maputnik-style-image-content">
        {src && <img className="maputnik-style-image-preview" src={src} alt={name} data-wd-key={"modal:images.preview:" + name} />}
        <p data-wd-key={"modal:images.slots:" + name}>
          {slots.length > 0
            ? t("Template with the slots {{slots}}. A layer fills them with params.", { slots: slots.join(", ") })
            : t("No slots.")}
        </p>
        <label className="maputnik-style-image-file">
          {t("Replace with an SVG file")}{" "}
          <input
            type="file"
            accept=".svg,image/svg+xml"
            data-wd-key={"modal:images.replace:" + name}
            onChange={e => { onReplace(name, e.target.files?.[0]); e.target.value = ""; }}
          />
        </label>
      </div>
    </div>;
  });

  return <Modal
    data-wd-key="modal:images"
    isOpen={props.isOpen}
    onOpenToggle={props.onOpenToggle}
    title={t("Images")}
  >
    <section className="maputnik-modal-section">
      <h1>{t("Images in the style")}</h1>
      <p>{t("Map Jr. GL draws the images of metadata[\"map-jr:images\"]. MapLibre GL JS ignores them.")}</p>
      {images.length === 0 && <p>{t("The style has no images.")}</p>}
      {images}
    </section>
    {error && <p className="maputnik-modal-error" data-wd-key="modal:images.error">{error}</p>}
    <section className="maputnik-modal-section">
      <h1>{t("Add Image")}</h1>
      <FieldString
        label={t("Name")}
        fieldSpec={{ doc: t("The name that icon-image and the patterns use. Without a name, the image gets the name of the file.") }}
        value={newName}
        onInput={(v: string | undefined) => setNewName(v || "")}
        onChange={(v: string | undefined) => setNewName(v || "")}
        data-wd-key="modal:images.add.name"
      />
      <label className="maputnik-style-image-file">
        {t("SVG file")}{" "}
        <input
          type="file"
          accept=".svg,image/svg+xml"
          data-wd-key="modal:images.add.file"
          onChange={e => { onAdd(e.target.files?.[0]); e.target.value = ""; }}
        />
      </label>
    </section>
  </Modal>;
};

export const ModalImages = withTranslation()(ModalImagesInternal);
