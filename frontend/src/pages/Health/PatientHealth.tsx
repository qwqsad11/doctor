import { displaySystemText } from "@/utils/labels";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  List,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";
import { patientRequest, errorMessage } from "@/services/workflows";
import type { PatientHealth } from "@/services/workflows";
import {
  MeasurementFields,
  MeasurementTable,
  localDateTime,
} from "./HealthWidgets";
import { formatDateTime } from "@/utils/format";
export default function PatientHealthPage() {
  const [token] = useState(() => {
    const fragment = window.location.hash.slice(1);
    if (fragment) {
      sessionStorage.setItem("patient-health-access", fragment);
      window.history.replaceState(null, "", window.location.pathname);
    }
    return fragment || sessionStorage.getItem("patient-health-access") || "";
  });
  const [data, setData] = useState<PatientHealth | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const d = await patientRequest<PatientHealth>(token);
        if (active) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError(errorMessage(e));
          setData(null);
        }
      }
    };
    void refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token]);
  const submit = async () => {
    try {
      const v = await form.validateFields();
      setBusy(true);
      v.measured_at = new Date(v.measured_at).toISOString();
      await patientRequest(token, v);
      setData(await patientRequest<PatientHealth>(token));
      form.resetFields();
      form.setFieldsValue({ kind: "血压", measured_at: localDateTime() });
      message.success("Measurements uploaded and available to your doctor");
    } catch (e) {
      if (!(e as { errorFields?: unknown }).errorFields)
        message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <Typography.Title level={2}>My Health Management</Typography.Title>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          description="Contact your doctor for a new patient link."
        />
      )}
      {data && (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card title={data.patient_name + " · " + data.plan}>
            <Descriptions column={1}>
              <Descriptions.Item label="Health goals">
                {data.goals || "Not available"}
              </Descriptions.Item>
              <Descriptions.Item label="Health guidance">
                {data.guidance || "Not available"}
              </Descriptions.Item>
              <Descriptions.Item label="Next assessment">
                {data.next_assessment_at
                  ? formatDateTime(data.next_assessment_at)
                  : "Not scheduled"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Card>
            <Tabs
              items={[
                {
                  key: "upload",
                  label: "Upload measurements",
                  children: (
                    <Form
                      form={form}
                      layout="vertical"
                      initialValues={{
                        kind: "血压",
                        measured_at: localDateTime(),
                      }}
                    >
                      <MeasurementFields />
                      <Button type="primary" loading={busy} onClick={submit}>

                        Upload data
                      </Button>
                    </Form>
                  ),
                },
                {
                  key: "messages",
                  label: "Health reminders",
                  children: (
                    <List
                      dataSource={data.entries.filter(
                        (e) => e.kind === "notification",
                      )}
                      pagination={{ pageSize: 10 }}
                      locale={{ emptyText: "No reminders yet" }}
                      renderItem={(e) => (
                        <List.Item>
                          <List.Item.Meta
                            title={displaySystemText(e.data.message)}
                            description={formatDateTime(e.created_at)}
                          />
                        </List.Item>
                      )}
                    />
                  ),
                },
                {
                  key: "history",
                  label: "Measurement history",
                  children: <MeasurementTable entries={data.entries} />,
                },
              ]}
            />
          </Card>
        </Space>
      )}
    </div>
  );
}
