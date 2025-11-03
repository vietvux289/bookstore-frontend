import { getCategoryAPI, UpdateBookAPI, updateUserAPI, uploadFileAPI } from "@/services/api";
import { FILE_SIZE_MAX } from "@/services/helper";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { App, Col, Divider, Form, GetProp, Image, Input, InputNumber, Modal, Row, Select, Upload, UploadFile, UploadProps } from "antd";
import { useForm } from "antd/es/form/Form";
import { UploadChangeParam } from "antd/es/upload";
import { UploadFileStatus } from "antd/es/upload/interface";
import { FormProps } from "antd/lib";
import { useEffect, useState } from "react";

interface IProps {
  openBookUpdate: boolean;
  setOpenBookUpdate: (v: boolean) => void;
  refreshTable: () => void;
  dataUpdate: IBookTable | null;
  setDataUpdate: (v: IBookTable | null) => void;
}

type FieldTypeUpdate = {
  mainText: string;
  author: string;
  price: number;
  category: string;
  quantity: number;
  thumbnail: UploadFile[];
  slider: UploadFile[];
}

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

const BookUpdate = (props: IProps) => {
  const {
    openBookUpdate,
    setOpenBookUpdate,
    refreshTable,
    dataUpdate,
    setDataUpdate,
  } = props;

  const [formUpdateBook] = useForm();
  const { notification, message } = App.useApp();
  const [isSubmit, setIsSubmit] = useState<boolean>(false);
  const [fileListThumbnail, setFileListThumbnail] = useState<UploadFile[]>([]);
  const [fileListSlider, setFileListSlider] = useState<UploadFile[]>([]);
  const [listCategory, setListCategory] = useState<{
    label: string;
    value: string;
  }[]>([]);
  const [loadingThumbnail, setLoadingThumbnail] = useState<boolean>(false);
  const [loadingSlider, setLoadingSlider] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | undefined>(undefined);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!dataUpdate) return;

    const createUploadList = (names?: string[]) => 
      names?.map((img, idx) => ({
        uid: `${idx}`,
        name: img,
        status: 'done' as UploadFileStatus,
        url: `${import.meta.env.VITE_BACKEND_URL}/images/book/${img}`,
      })) || [];

    const thumbnailList = dataUpdate.thumbnail ? [{
      uid: '-1',
      name: dataUpdate.thumbnail,
      status: 'done' as UploadFileStatus,
      url: `${import.meta.env.VITE_BACKEND_URL}/images/book/${dataUpdate.thumbnail}`,
    }] : [];

    const sliderList = createUploadList(dataUpdate.slider as string[]);

    formUpdateBook.setFieldsValue({
      mainText: dataUpdate.mainText,
      author: dataUpdate.author,
      price: dataUpdate.price,
      category: dataUpdate.category,
      quantity: dataUpdate.quantity,
      thumbnail: thumbnailList,
      slider: sliderList,
    });

    setFileListThumbnail(thumbnailList);
    setFileListSlider(sliderList);
  }, [dataUpdate, openBookUpdate]);

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await getCategoryAPI();
      if (res?.data) {
        const categories = res.data.map(item => ({ label: item, value: item }));
        setListCategory(categories);
      }
    };
    fetchCategories();
  }, []);

  const onFinish: FormProps<FieldTypeUpdate>["onFinish"] = async (values) => {
    if (!dataUpdate?._id) {
      message.error("Book ID not found!");
      return;
    }

    setIsSubmit(true);

    try {
      // Prefer server-provided filename from upload response when present
      const thumbnail = values.thumbnail?.[0]?.response?.fileName
        ?? values.thumbnail?.[0]?.name
        ?? dataUpdate.thumbnail;
      const slider = (values.slider?.map(file => file.response?.fileName ?? file.name) || dataUpdate.slider) as string[];

      const res = await UpdateBookAPI(
        dataUpdate._id,
        values.mainText,
        values.author,
        Number(values.price),
        values.category,
        Math.floor(Number(values.quantity || 0)),
        thumbnail,
        slider
      );

      if (res?.data) {
        notification.success({
          message: "Update book successfully!",
          description: `Book "${values.mainText}" has been updated.`,
        });

        formUpdateBook.resetFields();
        setDataUpdate(null);
        setOpenBookUpdate(false);
        refreshTable();
      } else {
        notification.error({
          message: "Update failed!",
          description: JSON.stringify(res?.message || "Unknown error"),
        });
      }
    } catch (error: any) {
      notification.error({
        message: "Update failed!",
        description: error?.message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmit(false);
    }
  };


  // const normalFile = (e: any) => {
  //   if (Array.isArray(e)) {
  //     return e;
  //   }
  //   return e?.fileList?.map((file: any) => ({ ...file, status: 'done' }));
  // };
  const normalFile = (e: any) => {
    if (!e) return [];
    if (Array.isArray(e)) return e;
    return Array.isArray(e?.fileList)
      ? e.fileList.map((file: any) => ({ ...file, status: 'done' }))
      : [];
  };


  const getBase64 = (file: FileType): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });


  const handleUploadThumbnail: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    const thumbnail = await uploadFileAPI(file, "book");
    if (thumbnail?.data) {
      const uploadFile = file as UploadFile;
      setFileListThumbnail([{
        uid: uploadFile.uid,
        name: thumbnail.data.fileUploaded,
        status: 'done',
        url: `${import.meta.env.VITE_BACKEND_URL}/images/book/${thumbnail.data.fileUploaded}`,
      }]);
      // notify Upload that it's done
      onSuccess?.({ fileName: thumbnail.data.fileUploaded } as any);
    } else {
      message.error('Upload thumbnail failed!');
      onError?.(new Error('Upload thumbnail failed'));
    }
  };

  const handleUploadSlider: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    const sliders = await uploadFileAPI(file, "book");
    if (sliders?.data) {
      const uploadFile = file as UploadFile;
      setFileListSlider((prev) => ([
        ...prev,
        {
          uid: uploadFile.uid,
          name: sliders.data.fileUploaded,
          status: 'done',
          url: `${import.meta.env.VITE_BACKEND_URL}/images/book/${sliders.data.fileUploaded}`,
        }
      ]));
      onSuccess?.({ fileName: sliders.data.fileUploaded } as any);
    } else {
      message.error('Upload slider image failed!');
      onError?.(new Error('Upload slider image failed'));
    }
  };

  const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('You can only upload JPG/PNG file!');
    }
    const isLt2M = file.size / 1024 / 1024 < FILE_SIZE_MAX;
    if (!isLt2M) {
      message.error(`Image must smaller than ${FILE_SIZE_MAX}MB!`);
    }
    return isJpgOrPng && isLt2M || Upload.LIST_IGNORE;
  };

  const handleChange = (info: UploadChangeParam, type: "thumbnail" | "slider") => {
    let fileList = [...info.fileList];
    fileList = fileList.map(file => {
      // Normalize: when upload finished, use filename returned by server
      if ((file as any).response?.fileName) {
        file.name = (file as any).response.fileName;
      }
      if (file.status === 'uploading' || !file.status) {
        file.status = 'done';
      }
      return file;
    });

    if (type === 'slider') {
      setLoadingSlider(false);
      setFileListSlider(fileList);
      formUpdateBook.setFieldValue("slider", fileList);
    } else {
      setLoadingThumbnail(false);
      setFileListThumbnail(fileList);
      formUpdateBook.setFieldValue("thumbnail", fileList);
    }
  };
  const handleRemove = (file: UploadFile, type: "thumbnail" | "slider") => {
    if (type === 'slider') {
      const newFileList = fileListSlider.filter(item => item.uid !== file.uid);
      setFileListSlider(newFileList);
      formUpdateBook.setFieldValue('slider', newFileList);
    } else {
      setFileListThumbnail([]);
      formUpdateBook.setFieldValue('thumbnail', []);
    }
  };

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }

    setPreviewImage(file.url ?? (file.preview as string | undefined));
    setPreviewOpen(true);
  };



  return (
    <>
      <Modal
        title="Update new book"
        open={openBookUpdate}
        onOk={() => formUpdateBook.submit()}
        onCancel={() => {
          setOpenBookUpdate(false);
          formUpdateBook.resetFields();
          setDataUpdate(null);
          formUpdateBook.resetFields();
          setFileListThumbnail([]);
          setFileListSlider([]);
        }}
        okText={"Update"}
        okButtonProps={{ loading: isSubmit }}
        destroyOnClose={true}
        confirmLoading={isSubmit}
        width={"50vw"}
        maskClosable={false}
      >
        <Divider />
        <Form
          form={formUpdateBook}
          name="form-add"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Row gutter={15}>
            <Col span={12}>
              <Form.Item<FieldTypeUpdate>
                labelCol={{ span: 24 }}
                label="Book name"
                name="mainText"
                rules={[{ required: true, message: 'Book name cannot be empty!' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<FieldTypeUpdate>
                labelCol={{ span: 24 }}
                label="Author"
                name="author"
                rules={[{ required: true, message: 'Author name cannot be empty!' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item<FieldTypeUpdate>
                labelCol={{ span: 24 }}
                label="Price"
                name="price"
                rules={[{ required: true, message: 'Price cannot be empty!' }]}>
                <InputNumber
                  min={1}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter={"đ"}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item<FieldTypeUpdate>
                labelCol={{ span: 24 }}
                label="Category"
                name="category"
                rules={[{ required: true, message: 'Category cannot be empty!' }]}>
                <Select
                  showSearch
                  allowClear
                  options={listCategory}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item<FieldTypeUpdate>
                labelCol={{ span: 24 }}
                label="Quantity"
                name="quantity"
                rules={[{ required: true, message: 'Quantity cannot be empty!' }]}>
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<FieldTypeUpdate>
                labelCol={{ span: 24 }}
                label="Thumbnail"
                name="thumbnail"
                rules={[{ required: true, message: 'Please upload thumbnail image!' }]}
                // convert value from Upload => form
                valuePropName="fileList"
                getValueFromEvent={normalFile}
              >
                <Upload
                  listType="picture-card"
                  className="avatar-uploader"
                  maxCount={1}
                  multiple={false}
                  customRequest={handleUploadThumbnail}
                  beforeUpload={beforeUpload}
                  onChange={(info) => handleChange(info, 'thumbnail')}
                  onRemove={(file) => handleRemove(file, 'thumbnail')}
                  onPreview={handlePreview}
                  fileList={fileListThumbnail || []}
                >
                  <div>
                    {loadingThumbnail ? <LoadingOutlined /> : <PlusOutlined />}
                    <div style={{ marginTop: "8px" }}>Upload</div>
                  </div>
                </Upload>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<FieldTypeUpdate>
                labelCol={{ span: 24 }}
                label="Sliders"
                name="slider"
                rules={[{ required: true, message: 'Please upload slider images!' }]}
                // convert value from Upload => form
                valuePropName="fileList"
                getValueFromEvent={normalFile}
              >
                <Upload
                  listType="picture-card"
                  className="avatar-uploader"
                  maxCount={5}
                  multiple={true}
                  customRequest={handleUploadSlider}
                  beforeUpload={beforeUpload}
                  onChange={(info) => handleChange(info, 'slider')}
                  onRemove={(file) => handleRemove(file, 'slider')}
                  onPreview={handlePreview}
                   fileList={fileListSlider || []}
                >
                  <div>
                    {loadingSlider ? <LoadingOutlined /> : <PlusOutlined />}
                    <div style={{ marginTop: "8px" }}>Upload</div>
                  </div>
                </Upload>
                {previewImage && (
                  <Image
                    style={{ display: 'none' }}
                    src={previewImage}
                    preview={{
                      visible: previewOpen,
                      onVisibleChange: (visible) => setPreviewOpen(visible),
                      afterOpenChange: (visible) => !visible && setPreviewImage(undefined),
                    }}
                  />
                )}
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {previewImage && (
          <Image
            style={{ display: 'none' }}
            src={previewImage}
                    preview={{
                      visible: previewOpen,
                      onVisibleChange: setPreviewOpen,
                      afterOpenChange: (visible) => !visible && setPreviewImage(undefined),
                    }}
          />
        )}
      </Modal>
    </>
  );
};

export default BookUpdate;