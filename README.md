# How To Run the Code ?

Run in Development Mode

```
npm run dev
```

Build

```
npm run build
```

Run Build Result

```
npm start
```

Run Unit Test

```
set NODE_ENV=test&&npm test
```

# How To Setup This Server ?

1. Make sure to create a .env file based on .env.example.
2. EMAIL_PASSWORD in .env is the app password of the email, not the password of email.
3. If you don't have an app password, please generate an app password first via the following link https://myaccount.google.com/apppasswords. You will be directed to set up 2-step verification first if you haven't already set it up.
4. This server app use role management with high flexibility. You will see that there is two router.post("/role") in /server/index.ts => authRoute method. You need to use the route above the middleware when you first setup this server to add the admin role and put your email on the whitelist. That way, then you can register as admin.

## step to register as admin and setup server (you can use postman or other http tools)

1. Use route `/auth/role` with method `POST` and body

```
{
    "name": "admin",
    "limits": [],
    "registration": {
        "approvement": true,
        "whitelist": ["your_email_here"]
    },
    "additions": []
}
```

2. After that register your email as admin via `/auth/register` with method `POST` and body

```
{
    "email": "your_email_here",
    "role": "admin",
    "additions": {
        "name": "Your Name",
        "password": "your_password"
    }
}
```

3. Perfect, now you are an admin. Don't forget to comment the add role route above middleware and uncomment the add role route bellow middleware. Then, you can login as admin via `/auth/login`with method `POST` and body bellow.

```
{
    "email": "your_email_here",
    "password": "your_password_here",
    "role": "admin"
}
```

4. Now, create user role via `/auth/role` with method `POST` and body

```
{
    "name": "user",
    "limits": [],
    "registration": {
        "approvement": false,
        "whitelist": []
    },
    "additions": [
        {
            "name": "borrowed_book_codes",
            "validations": [
                {
                    "method": "exists",
                    "message": "borrowed_book_codes is required"
                },
                {
                    "method": "isArray",
                    "validator": "{\"max\":0}",
                    "message": "borrowed_book_codes must be an empty array on registration"
                }
            ]
        },
        {
            "name": "penalized_at",
            "validations": [
                {
                    "method": "exists",
                    "message": "penalized_at is required"
                },
                {
                    "method": "isNull",
                    "message": "penalized_at value must be null on registration",
                }
            ]
        }
    ]
}
```

5. Register protected route via `/auth/route` with method `POST` and body

```
{
    "name": "/auth/verify-password",
    "restrictions": []
}
```

```
{
    "name": "/auth/change-password",
    "restrictions": []
}
```

```
{
    "name": "/auth/role",
    "restrictions": [
        { "method": "POST", "roles": ["admin"] },
        { "method": "PATCH", "roles": ["admin"] }
    ]
}
```

```
{
    "name": "/auth/route",
    "restrictions": [
        { "method": "POST", "roles": ["admin"] },
        { "method": "PATCH", "roles": ["admin"] }
    ]
}
```

```
{
    "name": "/users",
    "restrictions": [
        { "method": "GET", "roles": ["admin"] }
    ]
}
```

```
{
    "name": "/users/borrow-books",
    "restrictions": [
        { "method": "PATCH", "roles": ["user"] }
    ]
}
```

```
{
    "name": "/users/return-books",
    "restrictions": [
        { "method": "PATCH", "roles": ["user"] }
    ]
}
```

6. And that's it.

## API DOCUMENTATION

You can follow this url to access the API Documentation:

## Feature

- &check;&emsp;Role Management with High Flexibility with dynamic user data by role (no need to create one table for each role anymore).
- &check;&emsp;Dynamic protected server route. No one except admin can access the protected route before it is registered to database.
- &check;&emsp;Restricted frontend page via server.
- &check;&emsp;Registration restriction for specific role with admin approvement.
- &check;&emsp;Store JWT in HTTP only cookie.
- &check;&emsp;JWT data encryption, because data in JWT can be seen by all people.
- &check;&emsp;Access to reset password via email.
- &check;&emsp;Access to verify email via email.
- &check;&emsp;No Need to verify email again if the email just registered as new role.
- &check;&emsp;Change Password.
- &check;&emsp;Easy validation setup for new role.
- &check;&emsp;Main feature, borrow some books (max: 2 books), return books, penalty for late return, display user data (admin only), and display book data.
- &check;&emsp;Database transaction implementation for borrow books
