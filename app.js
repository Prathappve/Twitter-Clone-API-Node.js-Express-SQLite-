const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, 'twitterClone.db')
const app = express()
app.use(express.json())
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
let db = null
const InitializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

InitializeDBAndServer()

//Middleware to authenticate JWT Token
const authenticateToken = (request, response, next) => {
  const authHeader = request.headers['authorization']
  let jwtToken

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    response.status(401).send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_KEY', async (error, payload) => {
      if (error) {
        response.status(401).send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//API - 1: Register user
//Scenario-1: If the username already exists, response: User already exists
//Scenario-2: If the registrant provides a password with less than 6 characters, response: Password is too short
//Scenario-3: Successful registration of the registrant, response: User created successfully
app.post('/register/', async (request, response) => {
  try {
    const {username, password, name, gender} = request.body
    const checkUserQuery = `
    SELECT * FROM user WHERE username = ?;
    `
    const dbUser = await db.get(checkUserQuery, [username])
    if (dbUser === undefined) {
      if (password.length < 6) {
        response.status(400).send('Password is too short')
      } else {
        const hashedPassword = await bcrypt.hash(password, 10)
        const registerQuery = `
        INSERT INTO user (username, password, name, gender)
        VALUES (?, ?, ?, ?);
        `
        await db.run(registerQuery, [username, hashedPassword, name, gender])
        response.status(200).send('User created successfully')
      }
    } else {
      response.status(400).send('User already exists')
    }
  } catch (e) {
    console.log(`Error: "${e.message}"`)
  }
})

//API - 2: Login User
//Scenario-1: If the user doesn't have a Twitter account, response: Invalid user
//Scenario-2: If the user provides an incorrect password, response: Invalid password
//Scenario-3: Successful login of the user, response: Return the JWT Token
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const getUser = `
  SELECT * FROM user WHERE username = "${username}";
  `
  const dbUser = await db.get(getUser)
  if (dbUser === undefined) {
    response.status(400).send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'MY_SECRET_KEY')
      response.send({jwtToken})
    } else {
      response.status(400).send('Invalid password')
    }
  }
})

//API-3: Returns the latest tweets of people whom the user follows. Return 4 tweets at a time
app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {username} = request
  const getUserQuery = `
  SELECT * FROM user
  WHERE username = '${username}'`
  const dbUser = await db.get(getUserQuery)

  const userId = dbUser.user_id
  const getFeedQuery = `
  SELECT user.username AS username, tweet.tweet AS tweet, tweet.date_time AS dateTime FROM follower
  INNER JOIN tweet ON follower.following_user_id = tweet.user_id
  INNER JOIN user ON tweet.user_id = user.user_id
  WHERE follower.follower_user_id = ${userId}
  ORDER BY tweet.date_time DESC
  LIMIT 4`

  const feed = await db.all(getFeedQuery)
  response.send(feed)
})

//API-4: Returns the list of all names of people whom the user follows
app.get('/user/following/', authenticateToken, async (request, response) => {
  const {username} = request
  const getUserQuery = `
  SELECT * FROM user
  WHERE username = '${username}'`
  const dbUser = await db.get(getUserQuery)
  const userId = dbUser.user_id

  const getNamesQuery = `
  SELECT user.name AS name FROM follower
  INNER JOIN user ON follower.following_user_id = user.user_id
  WHERE follower.follower_user_id = ${userId}`

  const names = await db.all(getNamesQuery)
  response.send(names)
})

//API-5: Returns the list of all names of people who follows the user
app.get('/user/followers/', authenticateToken, async (request, response) => {
  const {username} = request
  const getUserQuery = `
  SELECT * FROM user
  WHERE username = '${username}'`

  const dbUser = await db.get(getUserQuery)
  if (dbUser === undefined) {
    response.status(400).send('User Not Found')
  }

  const userId = dbUser.user_id
  const getNamesQuery = `
  SELECT user.name AS name FROM follower
  INNER JOIN user ON follower.follower_user_id = user.user_id
  WHERE follower.following_user_id = ${userId}`

  const names = await db.all(getNamesQuery)
  response.send(names)
})

//API-6: Request the tweets of the users that user following
//Scenario-1: If the user requests a tweet other than the users he is following, response: Invalid Request
//Scenario-2: If the user requests a tweet of the user he is following, return the tweet, likes count, replies count and date-time
app.get('/tweets/:tweetId/', authenticateToken, async (request, response) => {
  const {username} = request
  const {tweetId} = request.params
  const getUserQuery = `
  SELECT * FROM user
  WHERE username = '${username}'`
  const dbUser = await db.get(getUserQuery)
  if (!dbUser) return response.status(400).send('User not found')
  const userId = dbUser.user_id
  const getTweetsQuery = `
  SELECT
        tweet.tweet AS tweet,
        tweet.date_time AS dateTime,
        COUNT(DISTINCT like.like_id) AS likes,
        COUNT(DISTINCT reply.reply_id) AS replies
      FROM tweet JOIN follower ON tweet.user_id = follower.following_user_id
      LEFT JOIN like ON tweet.tweet_id = like.tweet_id
      LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
      WHERE tweet.tweet_id = ? AND follower.follower_user_id = ?
      GROUP BY tweet.tweet_id
      ORDER BY tweet.date_time DESC`

  const tweet = await db.get(getTweetsQuery, [tweetId, userId])
  if (!tweet) {
    // User is not authorized to access this tweet
    return response.status(401).send('Invalid Request')
  }
  response.send(tweet)
})

//API-7: Request the users names who liked a tweet of the user that user following
//Scenario-1: If the user requests a tweet other than the users he is following, response: Invalid Request
//Scenario-2: If the user requests a tweet of a user he is following, return the list of usernames who liked the tweet
app.get(
  '/tweets/:tweetId/likes/',
  authenticateToken,
  async (request, response) => {
    const {username} = request
    const {tweetId} = request.params
    const getUserQuery = `
    SELECT * FROM user
    WHERE username = '${username}'`
    const dbUser = await db.get(getUserQuery)
    if (!dbUser) {
      return response.status(400).send('User not found')
    }
    const userId = dbUser.user_id
    // Check if the tweet belongs to someone the user is following
    const tweetAccessQuery = `
      SELECT 1 FROM tweet 
      JOIN follower ON tweet.user_id = follower.following_user_id
      WHERE tweet.tweet_id = ? AND follower.follower_user_id = ?`
    const access = await db.get(tweetAccessQuery, [tweetId, userId])
    if (!access) {
      return response.status(401).send('Invalid Request')
    }
    // If access is allowed, get the list of usernames who liked the tweet
    const likesQuery = `
      SELECT user.username
      FROM like
      JOIN user ON like.user_id = user.user_id
      WHERE like.tweet_id = ?;
    `
    const likes = await db.all(likesQuery, [tweetId])
    const likeUsernames = likes.map(user => user.username)
    response.send({likes: likeUsernames})
  },
)

//API-8: Request the replies of users who liked a tweet of the user that user following
//Scenario-1: If the user requests a tweet other than the users he is following, response: Invalid Request
//Scenario-2: If the user requests a tweet of a user he is following, return the list of replies.
app.get(
  '/tweets/:tweetId/replies/',
  authenticateToken,
  async (request, response) => {
    const {username} = request
    const {tweetId} = request.params
    const getUserQuery = `SELECT * FROM user
    WHERE username = '${username}'`
    const dbUser = await db.get(getUserQuery)
    if (!dbUser) {
      return response.status(401).send('User not found')
    }
    const userId = dbUser.user_id
    const checkTweetQuery = `
    SELECT * FROM follower
    INNER JOIN tweet ON follower.following_user_id = tweet.user_id
    WHERE tweet_id = ${tweetId} AND follower.follower_user_id = ${userId}`
    const queryCheck = await db.get(checkTweetQuery)

    if (!queryCheck) {
      return response.status(401).send('Invalid Request')
    }

    const repliesQuery = `
    SELECT user.name AS name, reply.reply AS reply FROM user
    INNER JOIN reply ON user.user_id = reply.user_id
    WHERE reply.tweet_id = ${tweetId}`

    const replies = await db.all(repliesQuery)
    const formattedReplies = replies.map(reply => ({
      name: reply.name,
      reply: reply.reply,
    }))
    response.send({replies: formattedReplies})
  },
)

//API-9: Returns a list of all tweets of the user
app.get('/user/tweets/', authenticateToken, async (request, response) => {
  const {username} = request
  const getUserQuery = `
  SELECT * FROM user
  WHERE username = '${username}'`
  const dbUser = await db.get(getUserQuery)

  if (dbUser === undefined) {
    return response.status(401).send('User not found')
  }

  const userId = dbUser.user_id

  const getTweetsQuery = `
  SELECT
  tweet.tweet AS tweet,
  COUNT(DISTINCT like.like_id) AS likes,
  COUNT(DISTINCT reply.reply_id) AS replies,
  tweet.date_time AS dateTime
  FROM tweet
  LEFT JOIN like ON tweet.tweet_id = like.tweet_id
  LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
  WHERE tweet.user_id = ${userId}
  GROUP BY tweet.tweet_id
  ORDER BY tweet.date_time DESC`

  const tweets = await db.all(getTweetsQuery)
  response.send(tweets)
})

//API-10: Create a tweet in the tweet table
app.post('/user/tweets/', authenticateToken, async (request, response) => {
  const {tweet} = request.body
  const {username} = request
  const getUserQuery = `
  SELECT * FROM user
  WHERE username = '${username}'`
  const dbUser = await db.get(getUserQuery)
  if (!dbUser) return response.status(400).send('User not found')
  const userId = dbUser.user_id

  const dateTime = new Date().toISOString()
  const createTweetQuery = `
  INSERT INTO tweet (tweet, user_id, date_time)
  VALUES (
    '${tweet}',
    ${userId},
    '${dateTime}'
  )`
  await db.run(createTweetQuery)
  response.send('Created a Tweet')
})

//API-11: Tweet delete request
app.delete(
  '/tweets/:tweetId/',
  authenticateToken,
  async (request, response) => {
    const {username} = request
    const {tweetId} = request.params
    const getUserQuery = `
    SELECT * FROM user
    WHERE username = '${username}'`
    const dbUser = await db.get(getUserQuery)
    if (!dbUser) return response.status(400).send('User not found')
    const userId = dbUser.user_id

    const checkTweetQuery = `
      SELECT * FROM tweet
      WHERE tweet_id = ${tweetId} AND user_id = ${userId}`
    const tweet = await db.get(checkTweetQuery)

    if (!tweet) {
      return response.status(401).send('Invalid Request') // Tweet doesn't belong to the user
    }

    const deleteTweetQuery = `
      DELETE FROM tweet
      WHERE tweet_id = ${tweetId}`
    await db.run(deleteTweetQuery)

    response.send('Tweet Removed')
  },
)

module.exports = app
