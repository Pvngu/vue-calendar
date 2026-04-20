<template>
    <div
        :class="[
            'p-0 text-gray-800 bg-white rounded-lg relative transition-all duration-300',
            showEndDate ? 'w-[520px]' : 'w-[450px]',
        ]"
    >
        <!-- Header -->
        <div
            class="p-4 pb-0! pl-6 pr-12 border-b flex flex-col justify-center relative min-h-[64px]"
        >
            <h2 class="text-[16px] font-medium m-0 text-gray-800 leading-tight">
                {{
                    activeTab === "event"
                        ? $t("calendar.new_event")
                        : activeTab === "task"
                          ? $t("calendar.new_task")
                          : $t("appointments.new_appointment")
                }}
            </h2>

            <button
                @click="onClose"
                class="absolute right-4 top-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors border-0 bg-transparent cursor-pointer"
            >
                <CloseOutlined class="text-[14px]" />
            </button>
        </div>

        <div class="p-4 sm:p-6 pt-0! pb-4">
            <!-- Date/Time Display Removed - Handled inside forms -->

            <!-- Form Fields -->
            <div class="pr-2">
                <a-tabs v-model:activeKey="activeTab" class="w-full">
                    <a-tab-pane
                        key="appointment"
                        :tab="$t('appointments.appointment')"
                    >
                        <AppointmentFormFields
                            :formData="formData"
                            @update:formData="
                                (newData) => Object.assign(formData, newData)
                            "
                            :rules="rules"
                            :autoSelectDoctor="false"
                            :autoSelectPatient="false"
                            :doctorInfo="doctorInfo"
                            :roomsData="roomsData"
                            :treatmentTypesData="treatmentTypesData"
                            :isLoading="isLoading"
                            :showDateTimeRangePicker="true"
                            @modalState="(val) => $emit('warningState', val)"
                        />
                    </a-tab-pane>
                    <a-tab-pane key="event" :tab="$t('calendar.event')">
                        <EventTaskFormFields
                            :formData="eventFormData"
                            formType="event"
                            @update:formData="
                                (newData) =>
                                    Object.assign(eventFormData, newData)
                            "
                            :autoSelectDoctor="false"
                            :doctorInfo="doctorInfo"
                            @modalState="(val) => $emit('warningState', val)"
                        />
                    </a-tab-pane>
                    <a-tab-pane key="task" :tab="$t('calendar.task')">
                        <EventTaskFormFields
                            :formData="taskFormData"
                            formType="task"
                            @update:formData="
                                (newData) =>
                                    Object.assign(taskFormData, newData)
                            "
                            :autoSelectDoctor="false"
                            @modalState="(val) => $emit('warningState', val)"
                        />
                    </a-tab-pane>
                </a-tabs>
            </div>
        </div>

        <!-- Footer Actions -->
        <div
            class="px-6 py-4 flex justify-end gap-3 border-t bg-gray-50 rounded-b-lg"
        >
            <a-button
                @click="onClose"
                class="w-[100px] hover:text-gray-900 border-gray-300"
            >
                Cancel
            </a-button>
            <a-button
                type="primary"
                :loading="isSubmitting"
                @click="handleSubmit"
                :disabled="isSubmitDisabled"
                class="bg-gray-900 hover:bg-gray-800 border-0 w-[100px] font-medium shadow-none"
            >
                {{ isSubmitting ? "Saving" : "Create" }}
            </a-button>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, inject } from "vue";
import { useI18n } from "vue-i18n";
import { CloseOutlined, ClockCircleOutlined } from "@ant-design/icons-vue";
import { Tabs as ATabs, Button as AButton, Modal } from "ant-design-vue";
const ATabPane = ATabs.TabPane;
import apiAdmin from "../../../common/composable/apiAdmin";
import common from "../../../common/composable/common";
import AppointmentFormFields from "./AppointmentFormFields.vue";
import EventTaskFormFields from "./EventTaskFormFields.vue";
import moment from "moment";
import dayjs from "dayjs";

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
    doctorInfo: {
        type: Object,
        default: () => ({}),
    },
    roomsData: {
        type: Array,
        default: () => [],
    },
    treatmentTypesData: {
        type: Array,
        default: () => [],
    },
    isLoading: {
        type: Boolean,
        default: false,
    },
});

const { t } = useI18n();
const { addEditRequestAdmin, rules } = apiAdmin();
const { selectedClinicId } = common();
const isSubmitting = ref(false);
const activeTab = ref(props.formData?.form_type || "appointment");
const eventFormData = ref({
    title: "",
    patient_id: null,
    user_id: null,
    description: "",
    color: "#039be5",
    duration_display: 30,
    duration_unit: "minutes",
});
const taskFormData = ref({
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
});

const getDurationMinutes = (formState) => {
    return formState.duration_unit === "hours"
        ? parseInt(formState.duration_display || 1) * 60
        : parseInt(formState.duration_display || 30);
};

const getComputedEndTime = (formState) => {
    if (!formState?.selectedTimeSlot) return null;
    return dayjs(`2000-01-01 ${formState.selectedTimeSlot}`)
        .add(getDurationMinutes(formState), "minute")
        .format("HH:mm");
};

const isSubmitDisabled = computed(() => {
    if (activeTab.value === "appointment") {
        return !props.formData.patient_id || !props.formData.treatment_type_id;
    } else if (activeTab.value === "event") {
        return !eventFormData.value.title;
    } else {
        return !taskFormData.value.title || !taskFormData.value.date;
    }
});

const showEndDate = computed(() => {
    let startStr, endStr;
    if (activeTab.value === "appointment") {
        if (
            !props.formData.selectedDate_full ||
            !props.formData.selectedTimeSlot
        )
            return false;
        startStr = props.formData.selectedDate_full;
        const durationMins =
            props.formData.duration_unit === "hours"
                ? parseInt(props.formData.duration_display || 1) * 60
                : parseInt(props.formData.duration_display || 30);
        endStr = dayjs(`${startStr} ${props.formData.selectedTimeSlot}`)
            .add(durationMins, "minute")
            .format("YYYY-MM-DD");
    } else if (activeTab.value === "event") {
        if (
            !eventFormData.value.selectedDate_full ||
            !eventFormData.value.selectedTimeSlot
        )
            return false;
        startStr = eventFormData.value.selectedDate_full;
        endStr = dayjs(
            `${startStr} ${getComputedEndTime(eventFormData.value)}`,
        ).format("YYYY-MM-DD");
    } else if (activeTab.value === "task") {
        if (
            !taskFormData.value.selectedDate_full ||
            !taskFormData.value.selectedTimeSlot
        )
            return false;
        startStr = taskFormData.value.selectedDate_full;
        const taskEndTime =
            taskFormData.value.endTime || getComputedEndTime(taskFormData.value);
        endStr = dayjs(`${startStr} ${taskEndTime}`).format("YYYY-MM-DD");
    }

    return startStr !== endStr;
});
watch(activeTab, (newTab, oldTab) => {
    props.formData.form_type = newTab;

    // Sync shared fields across tabs
    const sharedKeys = [
        "selectedDate_full",
        "selectedTimeSlot",
        "endTime",
        "doctor_id",
        "user_id",
        "patient_id",
        "title",
        "description",
        "color",
        "recurrence_rule",
    ];

    const getSource = (tab) => {
        if (tab === "appointment") return props.formData;
        if (tab === "event") return eventFormData.value;
        if (tab === "task") return taskFormData.value;
        return {};
    };

    const source = getSource(oldTab);
    const target = getSource(newTab);

    if (source && target) {
        sharedKeys.forEach((key) => {
            if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
                target[key] = source[key];
            }
        });

        if (newTab === "event") {
            target.endTime = getComputedEndTime({
                ...eventFormData.value,
                selectedTimeSlot:
                    target.selectedTimeSlot || source.selectedTimeSlot,
            });
        }

        if (newTab === "appointment") {
            const startTime = target.selectedTimeSlot || source.selectedTimeSlot;
            if (startTime) {
                const normalized = dayjs(`2000-01-01 ${startTime}`)
                    .add(getDurationMinutes(target), "minute")
                    .format("HH:mm");
                target.endTime = normalized;
            }
        }

        if (newTab === "task") {
            target.endTime =
                source.endTime ||
                target.endTime ||
                getComputedEndTime({
                    ...taskFormData.value,
                    selectedTimeSlot:
                        target.selectedTimeSlot || source.selectedTimeSlot,
                });
        }

        // Sync date for task
        if (newTab === "task" && source.selectedDate_full) {
            target.date = source.selectedDate_full;
        }
    }
});

watch(
    () => props.visible,
    (isVisible) => {
        if (isVisible) {
            if (props.formData.form_type) {
                activeTab.value = props.formData.form_type;
            } else {
                activeTab.value = "appointment";
            }
            props.formData.form_type = activeTab.value;

            // Initialize full date
            if (
                props.formData.currentYear !== undefined &&
                props.formData.currentMonth !== undefined &&
                props.formData.selectedDate
            ) {
                props.formData.selectedDate_full = moment()
                    .year(props.formData.currentYear)
                    .month(props.formData.currentMonth)
                    .date(props.formData.selectedDate)
                    .format("YYYY-MM-DD");

                // Initialize end time based on selectedTimeSlot and default duration
                if (
                    props.formData.selectedTimeSlot &&
                    !props.formData.endTime
                ) {
                    const durationMins =
                        props.formData.duration_unit === "hours"
                            ? parseInt(props.formData.duration_display || 1) *
                              60
                            : parseInt(props.formData.duration_display || 30);

                    const isPM = props.formData.selectedTimeSlot
                        .toLowerCase()
                        .includes("pm");
                    const [timePart] = props.formData.selectedTimeSlot
                        .toLowerCase()
                        .split(/am|pm/);
                    const [hours, minutes] = timePart.split(":");
                    let hour = parseInt(hours);
                    if (isPM && hour !== 12) hour += 12;
                    else if (!isPM && hour === 12) hour = 0;

                    const startM = moment()
                        .hour(hour)
                        .minute(minutes || 0);
                    props.formData.endTime = startM
                        .add(durationMins, "minutes")
                        .format("HH:mm");
                    // Reset to standard format
                    props.formData.selectedTimeSlot = moment()
                        .hour(hour)
                        .minute(minutes || 0)
                        .format("HH:mm");
                }

                // Sync to eventFormData as well
                eventFormData.value = {
                    ...eventFormData.value,
                    selectedDate_full: props.formData.selectedDate_full,
                    selectedTimeSlot: props.formData.selectedTimeSlot,
                    endTime: getComputedEndTime({
                        ...eventFormData.value,
                        selectedTimeSlot: props.formData.selectedTimeSlot,
                    }),
                    user_id: props.formData.user_id,
                };

                // Sync to taskFormData as well
                taskFormData.value = {
                    ...taskFormData.value,
                    date: props.formData.selectedDate_full,
                    selectedDate_full: props.formData.selectedDate_full,
                    selectedTimeSlot: props.formData.selectedTimeSlot,
                    endTime: props.formData.endTime,
                    user_id: props.formData.user_id,
                };
            }
        } else {
            // Reset event and task form data when popover closes
            eventFormData.value = {
                title: "",
                patient_id: null,
                user_id: null,
                description: "",
                color: "#039be5",
                duration_display: 30,
                duration_unit: "minutes",
            };
            taskFormData.value = {
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
            };
        }
    },
    { immediate: true },
);

watch(
    () => props.formData.form_type,
    (newFormType) => {
        if (newFormType && newFormType !== activeTab.value) {
            activeTab.value = newFormType;
        }
    },
);

// Removed displayTime and displayDate computed props

const convertTo24HourFormat = (time) => {
    if (!time) return "";
    if (
        !time.toLowerCase().includes("am") &&
        !time.toLowerCase().includes("pm")
    )
        return time;

    const isPM = time.toLowerCase().includes("pm");
    const [timePart] = time.toLowerCase().split(/am|pm/);
    const [hours, minutes] = timePart.split(":");

    let hour = parseInt(hours);
    if (isPM && hour !== 12) hour += 12;
    else if (!isPM && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, "0")}:${minutes || "00"}`;
};

const handleSubmit = () => {
    if (activeTab.value === "event") {
        submitEvent();
    } else if (activeTab.value === "task") {
        submitTask();
    } else {
        submitBooking(false);
    }
};

const submitEvent = () => {
    if (!eventFormData.value.title) return;

    isSubmitting.value = true;

    const finalDuration =
        eventFormData.value.duration_unit === "hours"
            ? parseInt(eventFormData.value.duration_display || 1) * 60
            : parseInt(eventFormData.value.duration_display || 30);

    const startM = dayjs(
        `${eventFormData.value.selectedDate_full} ${eventFormData.value.selectedTimeSlot}`,
    );
    const endM = startM.add(finalDuration, "minute");

    const bookingData = {
        clinic_id: selectedClinicId.value,
        user_id: eventFormData.value.user_id || props.formData.user_id,
        patient_id: eventFormData.value.patient_id,
        title: eventFormData.value.title,
        description: eventFormData.value.description,
        color: eventFormData.value.color,
        status: "pending",
        start_at: startM.format("YYYY-MM-DD HH:mm:ss"),
        end_at: endM.format("YYYY-MM-DD HH:mm:ss"),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrence_rule: eventFormData.value.recurrence_rule,
        _method: props.formData && props.formData.id ? "PUT" : "POST",
    };

    const isEdit = props.formData && props.formData.id;

    if (isEdit && eventFormData.value.update_mode) {
        bookingData.update_mode = eventFormData.value.update_mode;
    }

    executeSubmit("calendar-events", bookingData);
};

const executeSubmit = (url, bookingData) => {
    addEditRequestAdmin({
        url,
        data: bookingData,
        successMessage: t("calendar.event_created"),
        success: () => {
            isSubmitting.value = false;
            // Reset form
            eventFormData.value = {
                title: "",
                description: "",
                color: "#039be5",
                duration_display: 30,
                duration_unit: "minutes",
            };
            emit("addEditSuccess");
            onClose();
        },
        error: (err) => {
            isSubmitting.value = false;
        },
    });
};

const submitTask = () => {
    if (!taskFormData.value.title || !taskFormData.value.selectedDate_full)
        return;

    isSubmitting.value = true;

    // Convert time if provided
    let time = taskFormData.value.selectedTimeSlot;
    if (time && time.length > 5) {
        // Just extract HH:mm (if it includes seconds)
        time = time.substring(0, 5);
    }

    const startM = taskFormData.value.is_all_day
        ? dayjs(`${taskFormData.value.selectedDate_full} 00:00:00`)
        : dayjs(`${taskFormData.value.selectedDate_full} ${time || "00:00"}`);
    let endM = taskFormData.value.is_all_day
        ? dayjs(`${taskFormData.value.selectedDate_full} 23:59:59`)
        : taskFormData.value.endTime
          ? dayjs(
                `${taskFormData.value.selectedDate_full} ${taskFormData.value.endTime}`,
            )
          : startM.add(30, "minute");

    if (!taskFormData.value.is_all_day && endM.isBefore(startM)) {
        endM = endM.add(1, "day");
    }

    const taskData = {
        clinic_id: selectedClinicId.value,
        title: taskFormData.value.title,
        start_at: startM.format("YYYY-MM-DD HH:mm:ss"),
        end_at: endM.format("YYYY-MM-DD HH:mm:ss"),
        description: taskFormData.value.description,
        user_id: taskFormData.value.user_id || props.formData.user_id,
        patient_id: taskFormData.value.patient_id,
        status: taskFormData.value.status || "pending",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrence_rule: taskFormData.value.recurrence_rule,
        color: taskFormData.value.color,
        deadline: taskFormData.value.deadline
            ? dayjs(taskFormData.value.deadline).format("YYYY-MM-DD")
            : null,
        is_completed: taskFormData.value.is_completed ? 1 : 0,
        is_all_day: taskFormData.value.is_all_day ? 1 : 0,
    };

    addEditRequestAdmin({
        url: "calendar-tasks",
        data: taskData,
        successMessage: t("calendar.task_created"),
        success: () => {
            isSubmitting.value = false;
            taskFormData.value = {
                title: "",
                selectedDate_full: dayjs().format("YYYY-MM-DD"),
                time: null,
                description: "",
                status: "pending",
                user_id: null,
                patient_id: null,
                recurrence_rule: "",
                color: "#039be5",
                deadline: null,
                is_completed: false,
                is_all_day: true,
            };
            emit("addEditSuccess");
            onClose();
        },
        error: (err) => {
            isSubmitting.value = false;
        },
    });
};

const submitBooking = (force = false) => {
    if (!props.formData.patient_id || !props.formData.treatment_type_id) return;

    isSubmitting.value = true;

    const finalDuration =
        props.formData.duration_unit === "hours"
            ? parseInt(props.formData.duration_display || 1) * 60
            : parseInt(props.formData.duration_display || 30);

    const bookingData = {
        clinic_id: selectedClinicId.value,
        doctor_id: props.formData.doctor_id,
        patient_id: props.formData.patient_id,
        appointment_date: props.formData.selectedDate_full,
        appointment_time: props.formData.selectedTimeSlot,
        duration: finalDuration,
        reason_visit: props.formData.reason_visit || "",
        _method: "POST",
        room_id: props.formData.room_id,
        treatment_type_id: props.formData.treatment_type_id,
        price: props.formData.price || 0,
        recurrence_rule: props.formData.recurrence_rule,
        force: force,
    };

    addEditRequestAdmin({
        url: "doctor-schedule-days/create-appointment",
        data: bookingData,
        successMessage: t("appointments.created"),
        success: () => {
            isSubmitting.value = false;
            emit("addEditSuccess");
            onClose();
        },
        error: (err) => {
            isSubmitting.value = false;

            if (err.data?.is_warning) {
                const buildWarningMessage = (errData) => {
                    if (!errData || !errData.details || !errData.details.type) {
                        return errData?.message || t("common.warning");
                    }
                    const details = errData.details;
                    let vars = {};

                    if (details.type === "doctor_holiday") {
                        vars = { from: details.from, to: details.to };
                    } else if (details.type === "time_outside_schedule") {
                        vars = {
                            from: details.schedule_start,
                            to: details.schedule_end,
                        };
                    } else if (details.type === "doctor_break_conflict") {
                        vars = {
                            from: details.break_start,
                            to: details.break_end,
                        };
                    } else if (details.type === "appointment_conflict") {
                        vars = {
                            from: details.existing_appointment?.from,
                            to: details.existing_appointment?.to,
                            duration: details.existing_appointment?.duration,
                        };
                    }

                    return t(`appointments.warning_${details.type}`, vars);
                };

                emit("warningState", true);
                Modal.confirm({
                    title: t("common.warning"),
                    content: buildWarningMessage(err.data),
                    okText: t("common.proceed_anyway"),
                    cancelText: t("common.cancel"),
                    zIndex: 10000,
                    onOk: () => {
                        setTimeout(() => emit("warningState", false), 200);
                        submitBooking(true); // Retry with force flag
                    },
                    onCancel: () => {
                        setTimeout(() => emit("warningState", false), 200);
                    },
                });
            }
        },
    });
};

const onClose = () => {
    emit("closed");
};
</script>
