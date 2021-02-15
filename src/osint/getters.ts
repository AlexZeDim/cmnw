interface CharacterProps {
  _id: string,
  guildRank?: boolean,
  createOnlyUnique?: boolean,
  iteration?: number,
  forceUpdate?: boolean
}

export const getCharacter = async <T extends CharacterProps>(p: T): Promise<string|void> => {
  try {
    const { _id } = p;
    //_id;  string
    //rest; const rest: Pick<T, Exclude<keyof T, "a" | "b">>
    await new Promise(r => setTimeout(r, 5000));
    return _id
  } catch (e) {
    console.error(e)
  }
}
