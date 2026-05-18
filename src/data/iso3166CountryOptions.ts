import countriesJson from './iso3166-countries.json'

interface IsoRow {
  name: string
  'alpha-2': string
}

export interface CountryCodeOption {
  value: string
  label: string
}

export const ISO3166_COUNTRY_SELECT_OPTIONS: CountryCodeOption[] = (countriesJson as IsoRow[])
  .map((row) => ({
    value: row['alpha-2'],
    label: `${row.name} (${row['alpha-2']})`,
  }))
  .sort((a, b) => a.label.localeCompare(b.label))
