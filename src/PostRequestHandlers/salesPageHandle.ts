import {
  router,
  axios,
  bcrypt,
  ENV_VAR,
  check,
  validationResult,
  passport,
  flash,
  uuidv4,
  express,
} from "../All_Modules";
import { getJwtToken } from "../Jwt_Token";
import { getSellerData } from "../GLOBAL_DATA";

import { checkAuthSeller } from "../Passport_Config";

var sales_data_validate = [
  check("name")
    .not()
    .isEmpty()
    .withMessage("Name can not be empty")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 character."),

  check("phone")
    .not()
    .isEmpty()
    .withMessage("Password can not be empty")
    .isLength({ min: 10 })
    .withMessage("Phone number must be 10 digits."),

  check("email", "Email Address must be valid.")
    .not()
    .isEmpty()
    .withMessage("Email can not be empty")
    .isEmail()
    .trim()
    .escape()
    .normalizeEmail(),

  check("addressLine1").not().isEmpty().withMessage("This field can be empty!"),

  check("pincode")
    .not()
    .isEmpty()
    .withMessage("This field can not be empty!")
    .isNumeric()
    .withMessage("Must be a numeric value")
    .isLength({ min: 6, max: 6 }),

  check("qty")
    .not()
    .isEmpty()
    .withMessage("Minimum one device is required for registration.")
    .isNumeric()
    .withMessage("Must be a numeric value")
    .isLength({ min: 1, max: 1 }),
];

router.post(
  "/sales-page-handler",
  checkAuthSeller,
  sales_data_validate,
  (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    try {
      // Trying to handle this request on error validations..
      // If error object is not empty, then
      if (!errors.isEmpty()) {
        // return res.status(200).send("Server issues, please try in some time..");
        let err = JSON.stringify(errors);
        let errObj = JSON.parse(err);
        // console.log(errObj.errors[0]["msg"]);
        return res
          .status(200)
          .send(
            "Problem with the " +
              errObj.errors[0]["param"] +
              " field.\n" +
              errObj.errors[0]["msg"]
          );
      }

      // If no error is found then proceding further..
      console.log(req.body);

      // Some temperory varialbles
      let deviceArr: string[] = [];
      let newCumulativeOrderNo = 0;
      let payload = req.body;

      // NOTE important!!
      // this is where new device ids are created for the new connections
      for (let i = 0; i < req.body.qty; i++) {
        // generating new device ids for the given number of devices..
        deviceArr.push(uuidv4());
      }
      // console.log(device);

      // getting the last cumulativeOrderNumber for adding and saving
      axios({
        url: `http://${ENV_VAR.serverHost}:${ENV_VAR.strapi_PORT}/sales-infos?_sort=createdAt:DESC&_limit=1`,
        method: "get",
        headers: {
          authorization: `Bearer ${getJwtToken()}`,
        },
      })
        .then((result) => {
          // console.log(result);
          // console.log(result.data[0]["device-ids"]);
          // console.log(result.data[0].qty);
          // console.log(result.data[0].cumulativeOrderNo);
          // console.log(result.data[0]["seller-detail"]);
          if (result.data.length != 0) {
            newCumulativeOrderNo =
              Number(result.data[0].cumulativeOrderNo) + Number(payload.qty);
          } else {
            newCumulativeOrderNo = Number(payload.qty);
          }
          console.log(newCumulativeOrderNo);
          // let deviceJson = JSON.stringify({ ids: deviceArr });
          // let devicePayload = deviceArr.map((i) => '"' + i + '"');

          // Sending the new sales info to db for storage
          // tryig to send the data to the graphql server to save to database..
          axios({
            url: `${ENV_VAR.graphql_URL}`,
            method: "post",
            headers: {
              "X-XSS-Protection": 1,
              mode: "block",
              authorization: `Bearer ${getJwtToken()}`,
            },
            data: {
              query: `
              mutation newSalesInfo{
                createSalesInfo(
                  input:{
                    data:{
                      name:"${payload.name}"
                      phone:${payload.phone}
                      email:"${payload.email}"
                      addressLine1:"${payload.addressLine1}"
                      addressLine2:"${payload.addressLine2}"
                      addressLine3:"${payload.addressLine3}"
                      pincode:${payload.pincode}
                      device_id_array:{ids:[${deviceArr.map(
                        (i) => '"' + i + '"'
                      )}]}
                      qty:${payload.qty}
                      cumulativeOrderNo:${newCumulativeOrderNo}
                      soldAt:${payload.soldAt}
                      taxGst:${payload.tax}
                    }
                  }
                ){
                  salesInfo{
                    name
                    phone
                    email
                    addressLine1
                    addressLine2
                    addressLine3
                    pincode
                    device_id_array
                    qty
                    cumulativeOrderNo
                    soldAt
                    taxGst
                  }
                }
              }
              `,
            },
          })
            .then(function (response2) {
              // On sucessful..
              console.log(response2);
              console.log(response2.data.data.createSalesInfo);
              // If successful send the success message to user.
              return res
                .status(200)
                .send("New connection submitted successfully!!");
            })
            .catch((error) => {
              console.log(error);
              return res
                .status(200)
                .send("Unknown error occurred!! Please try again later.1");
            });
        })
        .catch((error) => {
          console.log(error);
          return res
            .status(200)
            .send("Unknown error occurred!! Please try again later.2");
        });
    } catch (error) {
      return res.status(200).send("Problem with inpute data!!");
    }
  }
);

export const salesPageHandle = router;
