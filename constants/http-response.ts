export const resMessage = {
  OK: "OK",
  successRegister:
    "email with access for account verification has been sent successfully and will be expired in 3 days",
  successRegisterNewRole: "registered as new role successfully",
  successVerifyEmail: "email has been verified successfully",
  successLogin: "login successfully",
  successRefreshToken: "refresh token successfully",
  successLogout: "logout successfully",
  successAddRole: "new role created successfully",
  successUpdateRole: "update this role successfully",
  successAddRoute: "new route registered successfully",
  successUpdateRoute: "update this route's roles successfully",
  successSendResetPassAccess:
    "email with access for reset password has been sent successfully and will be expired in 10 minutes",
  successResetPassword: "reset password successfully",
  successVerifyPassword: "password is correct",
  successChangePassword: "change password successfully",
  successAddBook: "new book created successfully",
  successUpdateBook: "update this book successfully",
  successBorrowBook: "borrow book successfully",
  successReturnBook: "return book successfully",

  internalServer: "our server encountered error, please try again later",
  requireRole: "role is required",
  routeIsNotFound: "this route is not availabe",
  userIsRegistered: "this email has been registered with this role",
  userIsNotFound: "this email has not been registered",
  userUnverified: "this email has not been verified",
  userIsVerified: "this email has been verified",
  invalidRole: "this email is not registered with this role",
  invalidToken: "token is invalid",
  wrongPassword: "password is incorrect",
  emailFailed: "failed to send email",
  noRefreshToken: "refresh token is not available",
  noAccessToken: "access token is not available",
  roleIsNotFound: "this role has not been created",
  roleIsExist: "this role already exist",
  otherRolePermit: 'the only accepted value for access limit are "readonly" or "noaccess"',
  restrictedRoute: "you don't have permission to access this route",
  serverRouteIsNotFound: "this route has not been registered",
  serverRouteIsExist: "this route has been registered",
  otherRouteMethod:
    'the only accepted value for restriction method are "GET", "POST", "PUT", "PATCH", or "DELETE"',
  maxMemberCodeExceeded: "maximum member code is exceeded",
  restrictedRole: "this email cannot be registered as this role",
  pageIsNaturalNumber: "page value must be an integer and greater than zero",
  bookIsExist: "book title with this author already exist",
  bookCodeIsUsed: "this book code has been used",
  stockIsWholeNumber: "stock value must be a positive integer",
  bookIsNotFound: "there is a book that has not been registered",
  bookIsOutOfStock: "there is a book that out of stock",
  tooManyBorrow: "each user cannot borrows more than 2 books",
  tooFewBorrow: "minimum book borrowing is 1 unit",
  penalizedUser: "this account cannot borrow a book due the penalty",
  hasBeenBorrow: "user cannot borrow the book that is being borrowed",
  hasNotBeenBorrow: "user cannot return books that has not been borrowed",
};

export const resCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  OK: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetCotent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  IMUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  CheckOther: 303,
  NotModified: 304,
  UseProxy: 305,
  SwitchProxy: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  URITooLong: 414,
  UnsuportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImTeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HTTPVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
};
