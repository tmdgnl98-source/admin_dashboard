interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <div className="flex items-center px-6 pt-6 pb-2">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
    </div>
  )
}
