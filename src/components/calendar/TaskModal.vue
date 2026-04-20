<template>
    <a-modal
        :open="visible"
        :title="$t('calendar.new_task', 'Task')"
        :width="500"
        :footer="null"
        :maskClosable="false"
        :onCancel="handleClose"
        centered
    >
        <div class="p-4 pt-2">
            <EventTaskFormFields
                :formData="formData"
                formType="task"
                :autoSelectDoctor="autoSelectDoctor"
                @update:formData="(newData) => Object.assign(formData, newData)"
            />

            <div class="mt-6 flex justify-end gap-3">
                <a-button @click="handleClose">
                    {{ $t("common.cancel") }}
                </a-button>
                <a-button
                    type="primary"
                    :loading="isSubmitting"
                    :disabled="isSubmitDisabled"
                    @click="handleSubmit"
                >
                    {{ $t("common.submit") }}
                </a-button>
            </div>
        </div>
    </a-modal>
</template>

<script setup>
import {
    Modal as AModal,
    Button as AButton,
} from "ant-design-vue";
import { ref, watch, reactive, computed } from "vue";
import EventTaskFormFields from "./EventTaskFormFields.vue";
import apiAdmin from "../../../common/composable/apiAdmin";
import common from "../../../common/composable/common";
import { useI18n } from "vue-i18n";
import dayjs from "dayjs";

const { t } = useI18n();
const { selectedClinicId } = common();

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    initialData: {
        type: Object,
        default: () => ({}),
    },
    autoSelectDoctor: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["closed", "addEditSuccess"]);

const { addEditRequestAdmin } = apiAdmin();

const isSubmitting = ref(false);

const normalizeTimeValue = (value) => {
    if (!value) return null;
    const directTimeMatch = String(value).match(/(\d{1,2}:\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
    if (directTimeMatch) {
        const parsed = dayjs(`2000-01-01 ${directTimeMatch[0].trim()}`);
        if (parsed.isValid()) return parsed.format("HH:mm");
    }

    const fromDateTime = dayjs(value);
    return fromDateTime.isValid() ? fromDateTime.format("HH:mm") : value;
};

const normalizeDateValue = (value) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : value;
};

const formData = reactive({
    title: "",
    date: dayjs().format("YYYY-MM-DD"),
    selectedDate_full: dayjs().format("YYYY-MM-DD"),
    selectedTimeSlot: null,
    endTime: null,
    description: "",
    status: "pending",
    user_id: null,
    patient_id: null,
    recurrence_rule: "",
    duration_display: 30,
    duration_unit: "minutes",
    color: "#039be5",
    is_all_day: true,
    deadline: null,
    is_completed: false,
});

watch(
    () => props.visible,
    (isVisible) => {
        if (isVisible) {
            // Reset form
            Object.assign(formData, {
                title: "",
                date: dayjs().format("YYYY-MM-DD"),
                selectedDate_full: dayjs().format("YYYY-MM-DD"),
                selectedTimeSlot: null,
                endTime: null,
                description: "",
                status: "pending",
                user_id: props.autoSelectDoctor
                    ? props.initialData.user_id
                    : null,
                patient_id: null,
                recurrence_rule: "",
                duration_display: 30,
                duration_unit: "minutes",
                color: "#039be5",
                is_all_day: true,
                deadline: null,
                is_completed: false,
            });

            if (props.initialData) {
                if (props.initialData.id) {
                    // Edit mode
                    Object.assign(formData, {
                        ...props.initialData,
                        is_completed: !!props.initialData.is_completed,
                        is_all_day: !!props.initialData.is_all_day,
                        date: normalizeDateValue(
                            props.initialData.appointment_date ||
                                props.initialData.start_at,
                        ),
                        selectedDate_full: normalizeDateValue(
                            props.initialData.appointment_date ||
                                props.initialData.start_at,
                        ),
                        selectedTimeSlot: normalizeTimeValue(
                            props.initialData.start_time ||
                                props.initialData.start_at,
                        ),
                        endTime: normalizeTimeValue(
                            props.initialData.end_time || props.initialData.end_at,
                        ),
                    });
                } else {
                    // Create mode from grid or header
                    if (
                        props.initialData.currentYear !== undefined &&
                        props.initialData.currentMonth !== undefined &&
                        props.initialData.selectedDate !== undefined
                    ) {
                        const startM = dayjs(
                            new Date(
                                props.initialData.currentYear,
                                props.initialData.currentMonth,
                                props.initialData.selectedDate,
                            ),
                        );
                        formData.selectedDate_full =
                            startM.format("YYYY-MM-DD");
                        formData.date = startM.format("YYYY-MM-DD");
                    }
                    if (props.initialData.selectedTimeSlot) {
                        formData.selectedTimeSlot =
                            normalizeTimeValue(
                                props.initialData.selectedTimeSlot,
                            );
                    }
                    if (props.initialData.endTime) {
                        formData.endTime = normalizeTimeValue(
                            props.initialData.endTime,
                        );
                    }
                }
            }

            if (
                !formData.is_all_day &&
                formData.selectedTimeSlot &&
                !formData.endTime
            ) {
                formData.endTime = dayjs(
                    `2000-01-01 ${formData.selectedTimeSlot}`,
                )
                    .add(30, "minute")
                    .format("HH:mm");
            }
        }
    },
);

const isSubmitDisabled = computed(() => {
    return !formData.title || !formData.selectedDate_full;
});

const handleClose = () => {
    emit("closed");
};

const handleSubmit = () => {
    if (isSubmitDisabled.value) return;

    isSubmitting.value = true;

    // Convert time if provided
    let time = formData.selectedTimeSlot;
    // Handle standard "09:00am" format from grid vs "09:00:00" from DB
    if (time && time.length > 5 && !time.includes("m")) {
        time = time.substring(0, 5);
    }

    const startM = formData.is_all_day
        ? dayjs(`${formData.selectedDate_full} 00:00:00`)
        : dayjs(`${formData.selectedDate_full} ${time || "00:00"}`);
    const selectedEndTime = normalizeTimeValue(formData.endTime);
    let endM = formData.is_all_day
        ? dayjs(`${formData.selectedDate_full} 23:59:59`)
        : selectedEndTime
          ? dayjs(`${formData.selectedDate_full} ${selectedEndTime}`)
          : startM.add(30, "minute");

    if (!formData.is_all_day && endM.isBefore(startM)) {
        endM = endM.add(1, "day");
    }

    const taskData = {
        clinic_id: selectedClinicId.value,
        title: formData.title,
        start_at: startM.format("YYYY-MM-DD HH:mm:ss"),
        end_at: endM.format("YYYY-MM-DD HH:mm:ss"),
        description: formData.description,
        user_id: formData.user_id,
        patient_id: formData.patient_id,
        status: formData.status || "pending",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrence_rule: formData.recurrence_rule,
        color: formData.color,
        deadline: formData.deadline
            ? dayjs(formData.deadline).format("YYYY-MM-DD")
            : null,
        is_completed: formData.is_completed ? 1 : 0,
        is_all_day: formData.is_all_day ? 1 : 0,
    };

    const isEdit = props.initialData && props.initialData.id;
    const url = isEdit
        ? `calendar-tasks/${props.initialData.id}`
        : "calendar-tasks";
    taskData._method = isEdit ? "PUT" : "POST";

    addEditRequestAdmin({
        url,
        data: taskData,
        successMessage: t(
            isEdit ? "calendar.task_updated" : "calendar.task_created",
            isEdit ? "Task updated successfully" : "Task created successfully",
        ),
        success: (res) => {
            isSubmitting.value = false;
            emit("addEditSuccess", res);
            handleClose();
        },
        error: (err) => {
            isSubmitting.value = false;
        },
    });
};
</script>
