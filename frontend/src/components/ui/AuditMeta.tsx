type Props = {
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
};

const AuditMeta = ({ createdBy, createdAt, updatedBy, updatedAt }: Props) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <p>
        Created: <span className="font-medium text-gray-700 dark:text-gray-100">{createdBy ?? "-"}</span> {createdAt ? `on ${createdAt}` : ""}
      </p>
      <p>
        Updated: <span className="font-medium text-gray-700 dark:text-gray-100">{updatedBy ?? "-"}</span> {updatedAt ? `on ${updatedAt}` : ""}
      </p>
    </div>
  </div>
);

export default AuditMeta;
