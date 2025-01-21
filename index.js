const { Sequelize, DataTypes } = require('sequelize'); // import sequelize

const sequelize = new Sequelize({
    dialect: 'sqlite',          // use sqlite dialect...
    storage: 'db/timetable.db'  // ...and point to the DB file
});

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        require: true,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        unique: true
    },
    firstname: {
        type: DataTypes.STRING
    },
    lastname: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'users',
    timestamps: false
});