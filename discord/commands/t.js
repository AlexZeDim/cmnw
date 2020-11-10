const axios = require('axios');

(async function T () {
  try {
    const id = `блюрателла@gordunni`
    const x = await axios.post('http://localhost:4000/graphql', {
      query: `query Character($id: ID!) {
        character(id: $id) {
          _id
          id
          name
          realm {
            _id
            name
            slug
          }
          guild {
            name
            slug
            rank
          }
          ilvl {
            eq
            avg
          }
          hash {
            a
            b
            c
            ex
            t
          }
          race
          character_class
          spec
          gender
          faction
          level
          lastModified
          media {
            avatar_url
            bust_url
            render_url
          }
          createdBy
          createdAt
          updatedBy
          updatedAt
          logs {
            type
            original_value
            new_value
            message
            action
            before
            after
          }
        }  
      }`,
      variables: { id },
    }).then(({ data: { data: { character } } }) => {
      console.log(character)
    })
  } catch (e) {
    console.error(e)
  }
})();
