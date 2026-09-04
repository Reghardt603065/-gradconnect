export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode ;}) {
  return <header className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}
