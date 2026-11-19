import { StarRating } from "./StarRating";
import { formatarData, type Review } from "./reviews";

type Props = {
  reviews: Review[];
  onDelete?: (id: string) => void;
  podeRemover?: (id: string) => boolean;
  vazio?: string | undefined;
};

export function ReviewList({ reviews, onDelete, podeRemover, vazio }: Props) {
  if (reviews.length === 0) {
    return (
      <p className="review-empty">
        {vazio ?? "Nenhuma avaliação com esse filtro. Tente outra nota ou serviço."}
      </p>
    );
  }

  return (
    <div className="review-list">
      {reviews.map((r) => (
        <article className="review-card" key={r.id}>
          <div className="review-head">
            <div>
              <div className="review-author">{r.autor}</div>
              <div className="review-service">{r.servico}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <StarRating value={r.nota} readOnly />
              <div className="review-date">{formatarData(r.data)}</div>
            </div>
          </div>
          <p className="review-text">{r.comentario}</p>
          {onDelete && podeRemover?.(r.id) && (
            <button className="review-delete" onClick={() => onDelete(r.id)}>
              Remover minha avaliação
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
