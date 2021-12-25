export interface SearchBody {
  query: {
    match: { [key: string]: string }
  }
}
