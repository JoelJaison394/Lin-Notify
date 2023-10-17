const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const sql = require("mssql");
const Joi = require("joi");
require("dotenv").config();
const helmet = require("helmet");
const compression = require("compression");
const winston = require("winston");
const app = express();

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASSWORD;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({ format: winston.format.simple() })
  );
}

const connectionString = process.env.DB_CONNECTION_STRING;

const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());

app.get("/", (req, res) => {
  res.send("WELCOME TO LIN NOTIFY!!");
});

app.get("/api/v1/users", (req, res) => {
  const query = "SELECT * FROM users";

  sql.connect(connectionString, (err) => {
    if (err) {
      logger.error(`Error connecting to database: ${err}`);
      return res.status(500).send("Internal Server Error");
    }

    const request = new sql.Request();

    request.query(query, (err, result) => {
      if (err) {
        logger.error(`Error querying database: ${err}`);
        sql.close();
        return res.status(500).send("Internal Server Error");
      }

      sql.close();
      res.json(result.recordset);
    });
  });
});

app.post("/api/v1/users/adduser", async (req, res) => {
  const schema = Joi.object({
    Username: Joi.string().required(),
    Password: Joi.string().required(),
    Email: Joi.string().email().required(),
    AdminNo: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    logger.error(`Error validating request body: ${error}`);
    return res.status(400).send("Bad Request");
  }

  const { Username, Password, Email, AdminNo } = req.body;

  const query = `
        INSERT INTO users ( Username, Password, Email , AdminNo)
        VALUES ( '${Username}', '${Password}', '${Email}' , '${AdminNo}')
    `;

  sql.connect(connectionString, (err) => {
    if (err) {
      logger.error(`Error connecting to database: ${err}`);
      return res.status(500).send("Internal Server Error");
    }

    const request = new sql.Request();

    request.query(query, (err) => {
      if (err) {
        logger.error(`Error adding user to the database: ${err}`);
        sql.close();
        return res.status(500).send("Internal Server Error");
      }

      sql.close();

      const htmlTemplate = `
                <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">

        <table style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <tr>
                        <td style="text-align: center; padding: 20px;">
                                <img src="https://res.cloudinary.com/dxraggwp4/image/upload/v1697559823/Logo_wbuaiu.png" alt="Lineways Notifier Logo" width="150" height="150">
                        </td>
                </tr>
                <tr>
                        <td style="padding: 0 20px;">
                                <h2>Welcome to Lin Notify</h2>
                                <p>Dear ${Username},</p>
                                <p>Thank you for joining Lin Notify. We are thrilled to have you on board!</p>
                                <p>You are now part of a growing community of users who rely on Lin  Notify to stay informed and connected.</p>
                                <p>Here are some of the features you can look forward to:</p>
                                <ul>
                                        <li>Real-time notifications.</li>
                                        <li>Customizable alerts and preferences.</li>
                                        <li>Stay updated on important events and news.</li>
                                </ul>
                                <p>We hope you have a great experience with Lin Notify.</p>
                                <p>If you have any questions or need assistance, please don't hesitate to contact our support team at support@ joeljaison394@gmail.com , vivekkj2004@gmail.com</p>
                                <p>Best regards,<br> The Lin Notify Team</p>
                        </td>
                </tr>
                <tr>
                        <td style="text-align: center; padding: 20px;">
                                <a href="https://www.lineways.com" style="background-color: #007bff; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Visit Lin Notify</a>
                        </td>
                </tr>
        </table>

        <p style="text-align: center; font-size: 12px; color: #888;">You're receiving this email because you signed up for Lin Notify.</p>
</body>
                `;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const mailOptions = {
        from: emailUser,
        to: `${Email}`,
        subject: "Thank you ❤️ for joining Lin Notify!",
        html: htmlTemplate,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          logger.error(`Error sending email: ${error}`);
        } else {
          logger.info(`Email sent: ${info.response}`);
        }
      });
    });
  });
  res.status(201).send("User added to the database");
});

app.use((req, res, next) => {
  res.status(404).send("Not Found");
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send("Internal Server Error");
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
