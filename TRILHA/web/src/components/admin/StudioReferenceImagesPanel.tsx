import { useCallback, useId, useRef, useState } from "react";
import type { StudioReferenceImage } from "../../lib/studioUploads";

type Props = {
  images: StudioReferenceImage[];
  uploading: boolean;
  onUploadFiles: (files: File[]) => void;
  onRemove: (path: string) => void;
};

export function StudioReferenceImagesPanel({ images, uploading, onUploadFiles, onRemove }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropActive, setDropActive] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list?.length) onUploadFiles(Array.from(list));
    e.target.value = "";
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length) onUploadFiles(files);
    },
    [onUploadFiles],
  );

  return (
    <section className="studio-refs" aria-labelledby={inputId + "-heading"}>
      <h2 id={inputId + "-heading"} className="studio-refs__title">
        Referências
      </h2>
      <p className="studio-refs__intro">
        Carrega imagens de inspiração ou exemplos para alinharmos o que queres no tabuleiro.
      </p>

      <input
        ref={inputRef}
        id={inputId}
        className="studio-refs__input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={onChange}
        aria-label="Escolher imagens de referência"
      />

      <div
        className={`studio-refs__drop${uploading ? " studio-refs__drop--busy" : ""}${dropActive ? " studio-refs__drop--active" : ""}`}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <p className="studio-refs__drop-text">
          Arrasta imagens para aqui ou{" "}
          <button type="button" className="studio-refs__link" onClick={handlePick} disabled={uploading}>
            escolhe ficheiros
          </button>
          .
        </p>
        <p className="studio-refs__meta">PNG, JPEG, WebP ou GIF · até 5 MB cada</p>
      </div>

      {images.length > 0 && (
        <ul className="studio-refs__list" aria-label="Imagens carregadas">
          {images.map((img) => (
            <li key={img.path} className="studio-refs__item">
              <div className="studio-refs__thumb-wrap">
                <img className="studio-refs__thumb" src={img.url} alt={img.name} loading="lazy" />
              </div>
              <div className="studio-refs__item-meta">
                <span className="studio-refs__name" title={img.name}>
                  {img.name}
                </span>
                <button
                  type="button"
                  className="studio-refs__remove"
                  onClick={() => onRemove(img.path)}
                  disabled={uploading}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
