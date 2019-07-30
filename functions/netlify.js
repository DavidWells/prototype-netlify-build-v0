exports.handler = async (event, context) => {
  console.log('function ran')
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello, World'
    })
  }
}
