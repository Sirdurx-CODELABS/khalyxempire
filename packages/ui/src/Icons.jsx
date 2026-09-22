export function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };
  const paths = {
    home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />,
    bag: (
      <>
        <path d="M6 8h12l-1 12H7L6 8z" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" />
      </>
    ),
    box: (
      <>
        <path d="M3 8.5 12 4l9 4.5-9 4.5L3 8.5z" />
        <path d="M3 8.5v7L12 20l9-4.5v-7" />
        <path d="M12 13v7" />
      </>
    ),
    tag: (
      <>
        <path d="M3 12.5V4h8.5L21 13.5 12.5 22z" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <circle cx="17" cy="9" r="2.2" />
        <path d="M21.5 19a4.5 4.5 0 0 0-6-4" />
      </>
    ),
    truck: (
      <>
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h4l3 3v4h-7" />
        <circle cx="7" cy="18.5" r="1.6" />
        <circle cx="17.5" cy="18.5" r="1.6" />
      </>
    ),
    barcode: (
      <>
        <path d="M4 6v12M7 6v12M9 6v12M13 6v12M16 6v12M20 6v12" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2z" />
        <path d="M12 8v8" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19h16" />
        <path d="M7 16v-5" />
        <path d="M12 16V7" />
        <path d="M17 16v-8" />
      </>
    ),
    people: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19a7 7 0 0 1 14 0" />
      </>
    ),
    cog: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </>
    ),
    pos: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    clipboard: (
      <>
        <rect x="6" y="5" width="12" height="16" rx="2" />
        <path d="M9 5V4h6v1" />
        <path d="M9 10h6M9 14h4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </>
    ),
    scale: (
      <>
        <path d="M12 4v16" />
        <path d="M5 10h14" />
        <path d="M5 10 8 16H4zM19 10l-3 6h4z" />
      </>
    ),
    search: <circle cx="11" cy="11" r="6" />,
    bell: (
      <>
        <path d="M6 16h12l-1-6a5 5 0 0 0-10 0z" />
        <path d="M10 16v1a2 2 0 0 0 4 0v-1" />
      </>
    ),
    logout: (
      <>
        <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" />
        <path d="M4 12h10M12 9l3 3-3 3" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    chevron: <path d="M15 6 9 12l6 6" />
  };
  return (
    <svg {...common}>
      {paths[name] || paths.box}
      {name === 'search' ? <path d="m16 16 4 4" /> : null}
    </svg>
  );
}
