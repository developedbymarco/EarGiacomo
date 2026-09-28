export type NavIconName = "home" | "path" | "practice" | "exam" | "board" | "friends" | "battles" | "more" | "account" | "login" | "logout";

export function NavIcon({ name, className = "size-6" }: { name: NavIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {iconPath(name)}
    </svg>
  );
}

function iconPath(name: NavIconName) {
  if (name === "home") return <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />;
  if (name === "path") {
    return (
      <>
        <circle cx="6" cy="7" r="2.2" />
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="18" cy="17" r="2.2" />
        <path d="M7.7 8.4 10.2 10.4M13.8 13.6 16.3 15.6" />
      </>
    );
  }
  if (name === "practice") {
    return (
      <>
        <path d="M9 18.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z" />
        <path d="M11.4 16V6.2L18 4.6v7.2" />
        <path d="M18 11.5a2.1 2.1 0 1 0 .1 4.2" />
      </>
    );
  }
  if (name === "exam") {
    return (
      <>
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M8.5 12.2 11 14.7l4.5-5" />
      </>
    );
  }
  if (name === "board") return <path d="M4 20V11h5v9M10.5 20V7h5v13M16 20V4h4v16" />;
  if (name === "friends") {
    return (
      <>
        <circle cx="9" cy="9" r="2.4" />
        <circle cx="16" cy="10" r="2" />
        <path d="M4.2 18.5c.7-2.5 2.6-3.8 4.8-3.8s4.1 1.3 4.8 3.8" />
        <path d="M13.8 15.1c1.5-.4 3 .1 3.8 1.4.5.8.8 1.6.9 2" />
      </>
    );
  }
  if (name === "battles") return <path d="M13 3 6 13h5l-1 8 8-11h-5z" />;
  if (name === "account") {
    return (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 19.2c1.1-3 3.3-4.5 6.5-4.5s5.4 1.5 6.5 4.5" />
      </>
    );
  }
  if (name === "login") {
    return (
      <>
        <path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10" />
        <path d="M10 12h9M15.5 8.5 19 12l-3.5 3.5" />
      </>
    );
  }
  if (name === "logout") {
    return (
      <>
        <path d="M14 4h3.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
        <path d="M14 12H5M8.5 8.5 5 12l3.5 3.5" />
      </>
    );
  }
  return (
    <>
      <circle cx="6" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </>
  );
}
