# Blog Website
### This site is live at [https://blog-website-auth.herokuapp.com/](https://blog-website-auth.herokuapp.com/)

To run locally you will need to install the node packages in package.json. In the terminal run:
```
npm install
touch .env
```
In the .env file you will need _MONGO_ATLAS_PATH=localhostORmongoAPIkey_ and SESSION_SECRET=somesecretpassword.
Then to run on _localhost:3000_: 
```
node app.js
```

### When a user is not logged in they can see the posts and an option to login in the upper right nav bar 
![Example Image1](public/images/ExampleImage1.PNG?raw=true)
![Example Image2](public/images/ExampleImage2.PNG?raw=true)

### Once a user is logged in they have the option to compose a new post, register a new user, and delete individual posts.
![Example Image3](public/images/ExampleImage3.PNG?raw=true)
![Example Image4](public/images/ExampleImage4.PNG?raw=true)