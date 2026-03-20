import COUNTRIES from "../data/countries";

export function CountryFlag({ countryName }) {
  const entry = COUNTRIES.find((c) => c.name === countryName);
  
  if (!entry) {
    return <span className="flag-emoji">🌍</span>;
  }

  return (
    <img 
      src={`https://flagcdn.com/w40/${entry.code.toLowerCase()}.png`} 
      srcSet={`https://flagcdn.com/w80/${entry.code.toLowerCase()}.png 2x`}
      width="24" 
      alt={entry.name}
      className="flag-icon"
      title={entry.name}
    />
  );
}
