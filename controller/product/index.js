import ProductModel from "../../modules/product/product";
import BaseComponent from "../../prototype/baseComponent";
import crypto from "crypto";
import fs from "fs";
import cookie from "cookie";
import formidable from "formidable";
import UserModel from "../../modules/user/user";

class Product extends BaseComponent {
  constructor() {
    super();
    this.save = this.save.bind(this);
    this.list = this.list.bind(this);
    this.upload = this.upload.bind(this);
  }

  async list(req, res, next) {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      console.log(fields);
      console.log(req.cookies.JSESSIONID);
      // 判断用户是否登陆
      try {
        if (!req.cookies.JSESSIONID) {
          throw new Error("用户未登录,请登录");
        }
      } catch (err) {
        res.send({
          status: 10,
          msg: err.message
        });
        return;
      }
      // 开始查询
      try {
        let pageSize =
          fields.pageSize > 0 ? Number.parseInt(fields.pageSize) : 1;
        let pageNum = fields.pageNum > 0 ? Number.parseInt(fields.pageNum) : 10;
        let total = await ProductModel.find().estimatedDocumentCount();
        if (!total) {
          res.send({
            state: 1,
            msg: "没有数据"
          });
          return;
        }
        /*let lastID = await ProductModel.findOne({
          id: total < pageSize * pageNum + 1 ? total : pageSize * pageNum + 1
        });*/
        let lastID =
          total < pageSize * pageNum + 1 ? total + 1 : pageSize * pageNum + 1;
        // 性能优化：获取最后一条数据前的数据
        let list = await ProductModel.find(
          { id: { $lt: lastID } },
          {
            _id: 0,
            __v: 0
          }
        )
          .sort({ _id: -1 })
          .limit(pageNum);
        console.log("list:", list);
        // 数据倒序
        list = list.sort((a, b) => a.index - b.index);
        res.json({
          status: 0,
          data: {
            pageNum: pageNum,
            pageSize: pageSize,
            size: pageSize,
            startRow: pageNum,
            total: total,
            pages: Math.ceil(total / pageNum),
            list: list
          }
        });
      } catch (err) {
        console.log(err);
        res.send({
          status: 1,
          msg: err.message
        });
      }
    });
  }

  async save(req, res, next) {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.send({
          status: 1,
          data: "更新产品失败"
        });
        return;
      }
      /*

      name        : this.state.name,
            subtitle    : this.state.subtitle,
            categoryId  : parseInt(this.state.categoryId),
            subImages   : this.getSubImagesString(),
            detail      : this.state.detail,
            price       : parseFloat(this.state.price),
            stock       : parseInt(this.state.stock),
            status      : this.state.status
       */
      const {
        name,
        subtitle,
        categoryId,
        subImages,
        detail,
        price,
        stock,
        status,
        id
      } = fields;
      try {
        const findOne = await ProductModel.findOne({ id: id ? id : 1 });
        if (!findOne) {
          const createInfo = await ProductModel.create(fields);
          let total = await ProductModel.find().estimatedDocumentCount();
          // createInfo.id = this.createID(createInfo._id);
          console.log(total);
          createInfo.id = total === 0 ? 1 : total;
          createInfo.save();
          res.send({
            status: 0,
            msg: "新增产品成功"
          });
        } else {
          Object.keys(fields).forEach(key => {
            findOne[key] = fields[key];
          });
          findOne.save();
          res.send({
            status: 0,
            msg: "更新产品成功"
          });
        }
      } catch (err) {
        // console.log(err);
        res.send({
          status: 1,
          data: "更新产品失败"
        });
      }
    });
  }

  // 图片上传
  async upload(req, res, next) {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.send({
          status: 1,
          data: "更新产品失败"
        });
        return;
      }
      try {
        const md5 = crypto.createHash("md5"),
          upload_file = files.upload_file,
          fileMd5 = md5
            .update(upload_file.name + Date.parse(new Date()) / 1000)
            .digest("hex"),
          fileType = upload_file.type.split("/")[1],
          fileName = fileMd5 + "." + fileType;
        fs.writeFileSync(
          "public/upload/images/" + fileName,
          fs.readFileSync(files.upload_file.path)
        );
        res.send({
          status: 0,
          data: {
            uri: fileName,
            url: "http://localhost:3000/public/" + fileName
          }
        });
      } catch (err) {
        console.log(err);
      }
    });
  }
}

export default new Product();
