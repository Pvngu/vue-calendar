<template>
    <div
        class="p-0 text-gray-800 bg-white rounded-lg relative transition-all duration-300"
        :class="isReadOnly ? 'w-[420px]' : 'w-[480px]'"
    >
        <!-- Header -->
        <div
            class="p-4 pb-0! pl-6 pr-12 border-b flex flex-col justify-center relative min-h-[56px]"
        >
            <div class="flex items-center gap-2">
                <a-tag
                    v-if="itemType === 'event'"
                    color="purple"
                    class="m-0 text-xs"
                    >{{ $t("calendar.event") }}</a-tag
                >
                <a-tag
                    v-else-if="itemType === 'task'"
                    color="cyan"
                    class="m-0 text-xs"
                    >{{ $t("calendar.task") }}</a-tag
                >
                <a-tag v-else color="blue" class="m-0 text-xs">{{
                    $t("appointments.appointment")
                }}</a-tag>
                <h2
                    class="text-[16px] font-medium m-0 text-gray-800 leading-tight"
                >
                    {{ displayTitle }}
                </h2>
            </div>

            <button
                @click="onClose"
                class="absolute right-4 top-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors border-0 bg-transparent cursor-pointer"
            >
                <CloseOutlined class="text-[14px]" />
            </button>
        </div>

        <div class="p-4 sm:p-6 pt-0! pb-4 max-h-[60vh] overflow-y-auto">
            <!-- Appointment Form Fields -->
            <AppointmentFormFields
                v-if="itemType === 'appointment'"
                :formData="localFormData"
                @update:formData="onFormDataUpdate"
                :rules="{}"
                :readOnly="isReadOnly"
                :autoSelectDoctor="false"
                :autoSelectPatient="false"
                :showDateTimeRangePicker="true"
                @modalState="(val) => $emit('warningState', val)"
            />

            <!-- Event Form Fields -->
            <EventTaskFormFields
                v-else-if="itemType === 'event'"
                :formData="localFormData"
                formType="event"
                @update:formData="onFormDataUpdate"
                :readOnly="isReadOnly"
                :autoSelectDoctor="false"
                @modalState="(val) => $emit('warningState', val)"
            />

            <!-- Task Form Fields -->
            <EventTaskFormFields
                v-else-if="itemType === 'task'"
                :formData="localFormData"
                formType="task"
                @update:formData="onFormDataUpdate"
                :readOnly="isReadOnly"
                :autoSelectDoctor="false"
                @modalState="(val) => $emit('warningState', val)"
            />
        </div>

        <!-- Footer Actions -->
        <div
            class="px-6 pb-3 flex items-center border-t rounded-b-lg"
        >
            <div class="flex justify-end w-full gap-3">
                <template v-if="isReadOnly">
                    <a-button
                        danger
                        type="text"
                        :loading="isDeleting"
                        @click="handleDelete"
                    >
                        <template #icon>
                            <DeleteOutlined />
                        </template>
                    </a-button>
                    <a-button
                        type="text"
                        @click="switchToEdit"
                    >
                        <template #icon>
                            <EditOutlined />
                        </template>
                    </a-button>
                </template>
                <template v-else>
                    <a-button @click="onCancel">
                        {{ $t("common.cancel") }}
                    </a-button>
                    <a-button
                        type="primary"
                        :loading="isSubmitting"
                        @click="handleSave"
                        class="bg-gray-900 hover:bg-gray-800 border-0 font-medium shadow-none"
                    >
                        {{ $t("common.save", "Save") }}
                    </a-button>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { Tag as ATag, Button as AButton, Modal } from "ant-design-vue";
import {
    CloseOutlined,
    EditOutlined,
    DeleteOutlined,
} from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";
import dayjs from "dayjs";
import AppointmentFormFields from "./AppointmentFormFields.vue";
import EventTaskFormFields from "./EventTaskFormFields.vue";
import apiAdmin from "../../../common/composable/apiAdmin";

const { t } = useI18n();
const { addEditRequestAdmin } = apiAdmin();

const emit = defineEmits(["closed", "addEditSuccess", "warningState"]);

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    formData: {
        type: Object,
        default: () => ({}),
    },
});

const localFormData = ref({});
const isReadOnly = ref(true);
const isSubmitting = ref(false);
const isDeleting = ref(false);

const itemType = computed(() => {
    if (localFormData.value.type === "event") return "event";
    if (localFormData.value.type === "task") return "task";
    return "appointment";
});

const displayTitle = computed(() => {
    if (itemType.value === "appointment") {
        return (
            localFormData.value.treatment_type ||
            localFormData.value.patient_name ||
            ""
        );
    }
    return localFormData.value.title || "";
});

watch(
    () => props.visible,
    (isVisible) => {
        if (isVisible) {
            localFormData.value = { ...props.formData };
            isReadOnly.value = true;
            isSubmitting.value = false;
        }
    },
    { immediate: true },
);

const onFormDataUpdate = (newData) => {
    Object.assign(localFormData.value, newData);
};

const switchToEdit = () => {
    isReadOnly.value = false;
};

const onCancel = () => {
    localFormData.value = { ...props.formData };
    isReadOnly.value = true;
};

const onClose = () => {
    emit("closed");
};

// --- Save Logic ---

// --- Delete Logic ---

const handleDelete = () => {
    Modal.confirm({
        title: t("common.delete_confirm", "Are you sure?"),
        content: t(
            "common.delete_confirm_message",
            "This action cannot be undone.",
        ),
        okText: t("common.yes", "Yes"),
        cancelText: t("common.no", "No"),
        okType: "danger",
        zIndex: 10000,
        onOk: () => {
            if (itemType.value === "appointment") {
                deleteAppointment();
            } else if (itemType.value === "event") {
                deleteEvent();
            } else {
                deleteTask();
            }
        },
    });
};

const deleteAppointment = () => {
    const fd = localFormData.value;
    isDeleting.value = true;

    addEditRequestAdmin({
        url: `doctor-schedule-days/${fd.xid}`,
        data: { _method: "DELETE" },
        successMessage: t("appointments.deleted", "Appointment deleted"),
        success: () => {
            isDeleting.value = false;
            emit("addEditSuccess");
        },
        error: () => {
            isDeleting.value = false;
        },
    });
};

const deleteEvent = () => {
    const fd = localFormData.value;
    isDeleting.value = true;

    addEditRequestAdmin({
        url: `calendar-events/${fd.xid}`,
        data: { _method: "DELETE" },
        successMessage: t(
            "calendar.event_deleted",
            "Event deleted successfully",
        ),
        success: () => {
            isDeleting.value = false;
            emit("addEditSuccess");
        },
        error: () => {
            isDeleting.value = false;
        },
    });
};

const deleteTask = () => {
    const fd = localFormData.value;
    isDeleting.value = true;

    addEditRequestAdmin({
        url: `calendar-tasks/${fd.xid}`,
        data: { _method: "DELETE" },
        successMessage: t(
            "calendar.task_deleted",
            "Task deleted successfully",
        ),
        success: () => {
            isDeleting.value = false;
            emit("addEditSuccess");
        },
        error: () => {
            isDeleting.value = false;
        },
    });
};

// --- Save Logic ---

const handleSave = () => {
    if (itemType.value === "appointment") {
        saveAppointment();
    } else if (itemType.value === "event") {
        saveEvent();
    } else {
        saveTask();
    }
};

const saveAppointment = (force = false) => {
    const fd = localFormData.value;
    if (
        !fd.doctor_id ||
        !fd.patient_id ||
        !fd.selectedDate_full ||
        !fd.selectedTimeSlot
    )
        return;

    isSubmitting.value = true;

    const finalDuration =
        fd.duration_unit === "hours"
            ? parseInt(fd.duration_display || 1) * 60
            : parseInt(fd.duration_display || 30);

    const bookingData = {
        doctor_id: fd.doctor_id,
        patient_id: fd.patient_id,
        appointment_date: fd.selectedDate_full,
        appointment_time: fd.selectedTimeSlot,
        duration: finalDuration,
        reason_visit: fd.reason_visit || "",
        xid: fd.xid,
        _method: "PUT",
        room_id: fd.room_id,
        treatment_type_id: fd.treatment_type_id,
        price: fd.price,
        force: force,
    };

    addEditRequestAdmin({
        url: "doctor-schedule-days/update-appointment",
        data: bookingData,
        successMessage: t("appointments.updated"),
        success: () => {
            isSubmitting.value = false;
            emit("addEditSuccess");
        },
        error: (err) => {
            isSubmitting.value = false;
            if (err.data?.is_warning) {
                Modal.confirm({
                    title: t("common.warning", "Warning"),
                    content: err.data.message || "Warning",
                    okText: t("common.proceed_anyway", "Proceed Anyway"),
                    cancelText: t("common.cancel", "Cancel"),
                    zIndex: 10000,
                    onOk: () => {
                        saveAppointment(true);
                    },
                });
            }
        },
    });
};

const saveEvent = () => {
    const fd = localFormData.value;
    isSubmitting.value = true;

    const finalDuration =
        fd.duration_unit === "hours"
            ? parseInt(fd.duration_display || 1) * 60
            : parseInt(fd.duration_display || 30);

    const startM = dayjs(`${fd.selectedDate_full} ${fd.selectedTimeSlot}`);
    const endM = startM.add(finalDuration, "minute");

    const bookingData = {
        user_id: fd.user_id,
        patient_id: fd.patient_id,
        title: fd.title,
        description: fd.description,
        start_at: startM.format("YYYY-MM-DD HH:mm:ss"),
        end_at: endM.format("YYYY-MM-DD HH:mm:ss"),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrence_rule: fd.recurrence_rule,
        color: fd.color,
        _method: "PUT",
    };

    if (fd.update_mode) {
        bookingData.update_mode = fd.update_mode;
    }

    addEditRequestAdmin({
        url: `calendar-events/${fd.xid}`,
        data: bookingData,
        successMessage: t(
            "calendar.event_updated",
            "Event updated successfully",
        ),
        success: (res) => {
            isSubmitting.value = false;
            emit("addEditSuccess", res);
        },
        error: () => {
            isSubmitting.value = false;
        },
    });
};

const saveTask = () => {
    const fd = localFormData.value;
    isSubmitting.value = true;

    let time = fd.selectedTimeSlot;
    if (time && time.length > 5 && !time.includes("m")) {
        time = time.substring(0, 5);
    }

    const startM = fd.is_all_day
        ? dayjs(`${fd.selectedDate_full} 00:00:00`)
        : dayjs(`${fd.selectedDate_full} ${time || "00:00"}`);
    let endM = fd.is_all_day
        ? dayjs(`${fd.selectedDate_full} 23:59:59`)
        : fd.endTime
          ? dayjs(`${fd.selectedDate_full} ${fd.endTime}`)
          : startM.add(30, "minute");

    if (!fd.is_all_day && endM.isBefore(startM)) {
        endM = endM.add(1, "day");
    }

    const taskData = {
        clinic_id: fd.clinic_id,
        title: fd.title,
        start_at: startM.format("YYYY-MM-DD HH:mm:ss"),
        end_at: endM.format("YYYY-MM-DD HH:mm:ss"),
        description: fd.description,
        user_id: fd.user_id,
        patient_id: fd.patient_id,
        status: fd.status || "pending",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrence_rule: fd.recurrence_rule,
        color: fd.color,
        deadline: fd.deadline
            ? dayjs(fd.deadline).format("YYYY-MM-DD")
            : null,
        is_completed: fd.is_completed ? 1 : 0,
        is_all_day: fd.is_all_day ? 1 : 0,
        _method: "PUT",
    };

    if (fd.update_mode) {
        taskData.update_mode = fd.update_mode;
    }

    addEditRequestAdmin({
        url: `calendar-tasks/${fd.xid}`,
        data: taskData,
        successMessage: t(
            "calendar.task_updated",
            "Task updated successfully",
        ),
        success: (res) => {
            isSubmitting.value = false;
            emit("addEditSuccess", res);
        },
        error: () => {
            isSubmitting.value = false;
        },
    });
};
</script>
