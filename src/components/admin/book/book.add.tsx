import { addBookAPI, getCategoryAPI, uploadFileAPI } from "@/services/api";
import { FILE_SIZE_MAX } from "@/services/helper";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { App, Col, Divider, Form, GetProp, Image, Input, InputNumber, Modal, Row, Select, UploadFile } from "antd"
import { useForm } from "antd/es/form/Form";
import { UploadChangeParam } from "antd/es/upload";
import { FormProps, Upload, UploadProps } from "antd/lib";
import { useEffect, useState } from "react";

interface IProps {
    openAddBook: boolean;
    setOpenAddBook: (v: boolean) => void;
    refreshTable: () => void
}
type FieldType = {
    mainText: string;
    author: string;
    price: number;
    category: string;
    quantity: number;
    thumbnail: UploadFile[];
    slider: UploadFile[];
}

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];


const BookAdd = (props: IProps) => {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');

    const [loadingThumbnail, setLoadingThumbnail] = useState<boolean>(false);
    const [loadingSlider, setLoadingSlider] = useState<boolean>(false);

    const [fileListThumbnail, setFileListThumbnail] = useState<UploadFile[]>([]);
    const [fileListSlider, setFileListSlider] = useState<UploadFile[]>([]);


    const [isSubmit, setIsSubmit] = useState<boolean>(false);
    const [listCategory, setListCategory] = useState<{
        label: string;
        value: string;
    }[]>([]);

    const { openAddBook, setOpenAddBook, refreshTable } = props;
    const { notification, message } = App.useApp();
    const [formAddBook] = useForm();

    useEffect(() => {
        const fetchListCategory = async () => {
            const res = await getCategoryAPI();
            if (res?.data) {
                const category = res.data.map(item => {
                    return { label: item, value: item };
                })
                setListCategory(category);
            }
        }
        fetchListCategory();
    }, [])


    const getBase64 = (file: FileType): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });

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

    const handlePreview = async (file: UploadFile) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj as FileType);
        }

        setPreviewImage(file.url || (file.preview as string));
        setPreviewOpen(true);
    };

    const handleChange = (info: UploadChangeParam, type: "thumbnail" | "slider") => {
        let fileList = [...info.fileList];
        fileList = fileList.map(file => {
            if (file.status === 'uploading' || !file.status) {
                file.status = 'done';
            }
            return file;
        });

        if (type === 'slider') {
            setLoadingSlider(false);
            formAddBook.setFieldValue("slider", fileList);
        } else {
            setLoadingThumbnail(false);
            formAddBook.setFieldValue("thumbnail", fileList);
        }
    };


    const handleUploadThumbnail: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
        const thumbnail = await uploadFileAPI(file, "book");
        if (thumbnail?.data) {
            const uploadFile = file as UploadFile;
            setFileListThumbnail([{
                uid: uploadFile.uid,
                name: thumbnail.data.fileUploaded
            }])
        }else {
            message.error('Upload thumbnail failed!');
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
                    name: sliders.data.fileUploaded
                }
            ]));
        }else {            
            message.error('Upload slider image failed!');
        }
    };

    const handleRemove = (file: UploadFile, type: "thumbnail" | "slider") => {
        if (type === 'slider') {
            const newFileList = fileListSlider.filter(item => item.uid !== file.uid);
            setFileListSlider(newFileList);
        } else {
            setFileListThumbnail([]);
        }
    };


    const normalFile = (e: any) => {
        if (Array.isArray(e)) {
            return e;
        }
        return e?.fileList?.map((file: any) => ({ ...file, status: 'done' }));
    };



    const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
        console.log('Received values of form: ', values);

        const res = await addBookAPI(
            values.mainText,
            values.author,
            values.price,
            values.category,
            values.quantity,
            fileListThumbnail[0].name,
            fileListSlider.map(file => file.name)
        );

        if (res.data) {
            formAddBook.resetFields();
            refreshTable();
            setOpenAddBook(false);
            notification.success({
                message: "Add new book",
                description: "Add book successfully!",
            })
        } else {
            notification.error({
                message: "Add new book!",
                description: res.message,
            });
        }
    }


    return (
        <>
            <Modal
                title="Add new book"
                open={openAddBook}
                onOk={() => formAddBook.submit()}
                onCancel={() => {
                    setOpenAddBook(false);
                    formAddBook.resetFields();
                }}
                okText={"Add"}
                okButtonProps={{ loading: isSubmit }}
                destroyOnClose={true}
                confirmLoading={isSubmit}
                width={"50vw"}
                maskClosable={false}
            >
                <Divider />
                <Form
                    form={formAddBook}
                    name="form-add"
                    onFinish={onFinish}
                    autoComplete="off"
                >
                    <Row gutter={15}>
                        <Col span={12}>
                            <Form.Item<FieldType>
                                labelCol={{ span: 24 }}
                                label="Book name"
                                name="mainText"
                                rules={[{ required: true, message: 'Book name cannot be empty!' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item<FieldType>
                                labelCol={{ span: 24 }}
                                label="Author"
                                name="author"
                                rules={[{ required: true, message: 'Author name cannot be empty!' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item<FieldType>
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
                            <Form.Item<FieldType>
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
                            <Form.Item<FieldType>
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
                            <Form.Item<FieldType>
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
                                    onRemove={(file) => handleRemove(file, 'slider')}
                                    onPreview={handlePreview}
                                >
                                    <div>
                                        {loadingThumbnail ? <LoadingOutlined /> : <PlusOutlined />}
                                        <div style={{ marginTop: "8px" }}>Upload</div>
                                    </div>
                                </Upload>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item<FieldType>
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
                                            afterOpenChange: (visible) => !visible && setPreviewImage(''),
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
                            afterOpenChange: (visible) => !visible && setPreviewImage(''),
                        }}
                    />
                )}
            </Modal>
        </>
    )
}

export default BookAdd;