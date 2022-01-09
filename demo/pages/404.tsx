import src from './main.svg?url'

const NotFound = () => (
  <section>
    <img src={src}/>
    <h1>404: Not Found</h1>
    <p>It's gone :(</p>
  </section>
)

export default NotFound
