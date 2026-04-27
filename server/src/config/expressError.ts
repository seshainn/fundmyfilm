class ExpressError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message);
    Object.setPrototypeOf(this, ExpressError.prototype);
  }
}

export default ExpressError;