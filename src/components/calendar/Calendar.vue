<template>
    <div class="printable-calendar-area bg-white border border-gray-200 rounded-lg overflow-hidden min-h-[640px]">
        <CalendarHeader
            :currentDate="currentDate"
            :formattedDate="formattedCurrentDate"
            :viewMode="viewMode"

            :resources="availableResources"
            :selectedResources="selectedResources"
            :sidebarVisible="showSidebar"
            :showWeekends="showWeekends"
            :showCompletedTasks="showCompletedTasks"
            @update:viewMode="onViewModeChange"
            @update:showWeekends="showWeekends = $event"
            @update:showCompletedTasks="showCompletedTasks = $event"
            @add-reservation="addReservation"
            @go-today="goToToday"
            @previous-date="previousDate"
            @next-date="nextDate"
            @toggle-sidebar="showSidebar = !showSidebar"
            @print-calendar="printCalendar"
            @select-date="(date) => (currentDate = date)"
        />

        <div class="calendar-content flex">
            <CalendarSidebar
                :visible="showSidebar"
                :resources="availableResources"
                :selectedResources="selectedResources"
                :singleSelect="viewMode === 'week' || viewMode === 'month'"
                :title="t('calendar.resources')"
                :allLabel="t('calendar.all_calendars')"
                @update:selectedResources="selectedResources = $event"
            />

            <div class="flex-1 overflow-x-hidden">
                <CalendarGrid
                    v-if="viewMode === 'day' || viewMode === 'week' || viewMode === 'day_single'"
                    :viewMode="gridViewMode"
                    :weekDays="weekDays"
                    :timeSlots="timeSlots"
                    :dentists="filteredResources"
                    :currentDate="currentDate"
                    :appointmentSlots="appointmentSlots"
                    :appointments="visibleAppointments"
                    :doctorHolidays="[]"
                    :timezoneOffset="timezoneName"
                    :isBreakTime="isBreakTime"
                    :isDoctorOnBreak="isResourceOnBreak"
                    :isSlotUnavailable="isSlotUnavailable"
                    :isDoctorOnHoliday="isResourceOnHoliday"
                    :isSlotOccupied="isSlotOccupied"
                    :isHourly="isHourly"
                    :draggedAppointmentId="draggedAppointmentId"
                    :resizingAppointmentId="resizingAppointmentId"
                    :isPopoverOpen="false"
                    :isOutsideSchedule="isOutsideSchedule"
                    @slot-click="onSlotClick"
                    @appointment-click="openAppointment"
                    @appointment-move="onAppointmentMove"
                    @drag-start="onDragStart"
                    @drag-end="onDragEnd"
                    @drag-move="onDragMove"
                    @resize-start="onResizeStart"
                    @resize-end="onAppointmentResize"
                    @task-complete-change="onTaskCompleteChange"
                />

                <CalendarMonth
                    v-else-if="viewMode === 'month'"
                    :currentDate="currentDate"
                    :appointments="visibleAppointments"
                    :dentists="availableResources"
                    @appointment-click="openAppointment"
                    @day-click="handleMonthDayClick"
                    @change-view="handleViewChange"
                    @task-complete-change="onTaskCompleteChange"
                />

                <CalendarAgenda
                    v-else-if="viewMode === 'agenda'"
                    :appointments="visibleAppointments"
                    :resources="availableResources"
                    :currentDate="currentDate"
                    @appointment-click="openAppointment"
                    @task-complete-change="onTaskCompleteChange"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import moment from "moment";
import CalendarHeader from "./CalendarHeader.vue";
import CalendarGrid from "./CalendarGrid.vue";
import CalendarMonth from "./CalendarMonth.vue";
import CalendarAgenda from "./CalendarAgenda.vue";
import CalendarSidebar from "./CalendarSidebar.vue";
import { useTranslation } from "../../composables/useTranslation";

const DATE_FORMAT_DB = "YYYY-MM-DD";
const SLOT_DURATION_MINUTES = 15;
const TIME_INPUT_FORMATS = ["hh:mm A", "h:mm A", "HH:mm", "HH:mm:ss"];

const props = defineProps({
    events: {
        type: Array,
        default: () => [],
    },
    resources: {
        type: Array,
        default: () => [],
    },
    modelValueDate: {
        type: String,
        default: "",
    },
});

const emit = defineEmits(["update:modelValueDate"]);
const { t } = useTranslation();

const viewMode = ref("day_single");
const showSidebar = ref(true);
const showWeekends = ref(true);
const showCompletedTasks = ref(true);
const draggedAppointmentId = ref(null);
const resizingAppointmentId = ref(null);

const initialDate = props.modelValueDate
    ? moment(props.modelValueDate, DATE_FORMAT_DB)
    : moment();
const currentDate = ref(initialDate.isValid() ? initialDate : moment());

const timezoneName = ref(
    new Date()
        .toLocaleTimeString("en-us", { timeZoneName: "short" })
        .split(" ")
        .pop(),
);

const normalizeResource = (resource) => ({
    ...resource,
    xid: resource?.xid ?? resource?.id,
    name: resource?.name || "",
    color: resource?.color || "#039be5",
});

const availableResources = computed(() =>
    props.resources
        .map(normalizeResource)
        .filter((resource) => resource?.xid !== undefined && resource?.xid !== null),
);

const selectedResources = ref([]);

watch(
    availableResources,
    (resources) => {
        const allIds = resources.map((resource) => resource.xid);
        if (!selectedResources.value.length) {
            selectedResources.value = allIds;
            return;
        }
        selectedResources.value = selectedResources.value.filter((id) =>
            allIds.includes(id),
        );
        if (!selectedResources.value.length) {
            selectedResources.value = allIds;
        }
    },
    { immediate: true },
);

watch(currentDate, (date) => {
    emit("update:modelValueDate", date.format(DATE_FORMAT_DB));
});

watch(
    () => props.modelValueDate,
    (dateStr) => {
        if (!dateStr) return;
        const parsed = moment(dateStr, DATE_FORMAT_DB, true);
        if (parsed.isValid()) {
            currentDate.value = parsed;
        }
    },
);

const normalizeTimeDisplay = (timeValue) => {
    const parsed = moment(timeValue, TIME_INPUT_FORMATS, true);
    if (!parsed.isValid()) return "12:00 AM";
    return parsed.format("hh:mm A");
};

const getResourceById = (resourceId) =>
    availableResources.value.find((resource) => resource.xid === resourceId);

const normalizeEvent = (event) => {
    const resourceId = event.resource_id ?? event.dentist_id ?? event.doctor_id ?? null;
    const resource = getResourceById(resourceId);

    return {
        ...event,
        id: event.id ?? event.xid,
        xid: event.xid ?? event.id,
        type: event.type || "appointment",
        resource_id: resourceId,
        dentist_id: resourceId,
        appointment_date:
            event.appointment_date ||
            event.date ||
            currentDate.value.format(DATE_FORMAT_DB),
        start_time: normalizeTimeDisplay(event.start_time),
        end_time: normalizeTimeDisplay(event.end_time),
        patient_name: event.patient_name || event.participant_name || event.title || "",
        color:
            event.color ||
            resource?.color ||
            (event.type === "task"
                ? "#52c41a"
                : event.type === "event"
                  ? "#722ed1"
                  : "#039be5"),
        status: event.status || "scheduled",
        is_all_day: Boolean(event.is_all_day),
    };
};

const sourceAppointments = computed(() => props.events.map(normalizeEvent));
const localAppointments = ref([]);

watch(
    sourceAppointments,
    (events) => {
        localAppointments.value = events;
    },
    { immediate: true },
);

const visibleAppointments = computed(() => {
    const selected = new Set(selectedResources.value);

    return localAppointments.value.filter((event) => {
        const resourceMatch = selected.size === 0 || selected.has(event.resource_id);
        if (!resourceMatch) return false;

        if (!showCompletedTasks.value && event.type === "task" && event.is_completed) {
            return false;
        }

        return true;
    });
});

const weekDays = computed(() => {
    if (viewMode.value !== "week") return [];

    const startOfWeek = currentDate.value.clone().startOf("isoWeek");
    const days = [];
    for (let index = 0; index < 7; index += 1) {
        const day = startOfWeek.clone().add(index, "days");
        const dayOfWeek = day.day();
        if (!showWeekends.value && (dayOfWeek === 0 || dayOfWeek === 6)) {
            continue;
        }

        days.push({
            date: day.format(DATE_FORMAT_DB),
            momentObj: day,
            label: day.format("D ddd"),
        });
    }
    return days;
});

const formattedCurrentDate = computed(() => {
    if (viewMode.value === "week" && weekDays.value.length > 0) {
        const first = weekDays.value[0].momentObj;
        const last = weekDays.value[weekDays.value.length - 1].momentObj;
        const firstMonth = first.format("MMM");
        const lastMonth = last.format("MMM");
        const year = last.format("YYYY");
        return firstMonth === lastMonth
            ? `${firstMonth} ${year}`
            : `${firstMonth} - ${lastMonth} ${year}`;
    }

    if (viewMode.value === "month" || viewMode.value === "agenda") {
        return currentDate.value.format("MMMM YYYY");
    }

    return currentDate.value.format("ddd, DD MMM YYYY");
});

const gridViewMode = computed(() =>
    viewMode.value === "day_single" ? "day" : viewMode.value,
);

const filteredResources = computed(() => {
    if (selectedResources.value.length === 0) return availableResources.value;
    return availableResources.value.filter((resource) =>
        selectedResources.value.includes(resource.xid),
    );
});


const isHourly = (time) => !time.includes(":");

const formatSlotTime = (dateMoment) => {
    const hour = dateMoment.hour();
    const minute = dateMoment.minute();
    const suffix = hour >= 12 ? "pm" : "am";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return minute === 0
        ? `${hour12}${suffix}`
        : `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
};

const convertAppointmentTimeToSlot = (timeValue) => {
    const parsed = moment(timeValue, TIME_INPUT_FORMATS, true);
    return parsed.isValid() ? formatSlotTime(parsed) : "12am";
};

const timeSlots = computed(() => {
    const slots = [];
    const start = moment("00:00", "HH:mm");
    const end = moment("23:59", "HH:mm");
    const cursor = start.clone();

    while (cursor.isBefore(end)) {
        slots.push(formatSlotTime(cursor));
        cursor.add(SLOT_DURATION_MINUTES, "minutes");
    }

    return slots;
});

const getAppointmentDurationInSlots = (appointment) => {
    const start = moment(appointment.start_time, TIME_INPUT_FORMATS, true);
    const end = moment(appointment.end_time, TIME_INPUT_FORMATS, true);
    if (!start.isValid() || !end.isValid()) return 1;

    const duration = Math.max(15, end.diff(start, "minutes"));
    return Math.max(1, Math.ceil(duration / SLOT_DURATION_MINUTES));
};

const appointmentSlots = computed(() => {
    const slots = {};
    const currentDateStr = currentDate.value.format(DATE_FORMAT_DB);
    const isCurrentViewDay =
        viewMode.value === "day" || viewMode.value === "day_single";

    visibleAppointments.value
        .filter((event) => {
            if (isCurrentViewDay) {
                return event.appointment_date === currentDateStr;
            }

            if (viewMode.value === "week") {
                return weekDays.value.some((day) => day.date === event.appointment_date);
            }

            return true;
        })
        .forEach((event) => {
            const slotTime = event.is_all_day
                ? "all-day"
                : convertAppointmentTimeToSlot(event.start_time);

            const key = isCurrentViewDay
                ? `${event.resource_id}-${slotTime}`
                : `${event.appointment_date}-${slotTime}`;

            if (!slots[key]) slots[key] = [];
            slots[key].push(event);
        });

    return slots;
});

const isResourceOnHoliday = () => false;
const isResourceOnBreak = () => false;
const isBreakTime = () => false;
const isSlotUnavailable = () => false;
const isOutsideSchedule = () => false;

const isSlotOccupied = (resourceId, timeSlot, dateStr = null) => {
    const slotIndex = timeSlots.value.indexOf(timeSlot);
    if (slotIndex === -1) return false;

    const targetDate = dateStr || currentDate.value.format(DATE_FORMAT_DB);

    return visibleAppointments.value.some((event) => {
        if (event.resource_id !== resourceId) return false;
        if (event.appointment_date !== targetDate) return false;

        const startSlot = convertAppointmentTimeToSlot(event.start_time);
        const startIndex = timeSlots.value.indexOf(startSlot);
        if (startIndex === -1) return false;

        const duration = getAppointmentDurationInSlots(event);
        return slotIndex > startIndex && slotIndex < startIndex + duration;
    });
};

const onDragStart = (appointment) => {
    draggedAppointmentId.value = appointment?.id ?? null;
};

const onDragMove = () => {};

const onDragEnd = () => {
    draggedAppointmentId.value = null;
};

const onResizeStart = (appointment) => {
    resizingAppointmentId.value = appointment?.id ?? null;
};

const onAppointmentResize = ({ appointment, newDuration, dateStr }) => {
    resizingAppointmentId.value = null;

    if (!appointment?.id || !newDuration) return;

    localAppointments.value = localAppointments.value.map((item) => {
        if (item.id !== appointment.id) return item;

        const start = moment(item.start_time, TIME_INPUT_FORMATS, true);
        if (!start.isValid()) return item;

        const end = start.clone().add(newDuration, "minutes");
        return {
            ...item,
            appointment_date: dateStr || item.appointment_date,
            end_time: end.format("hh:mm A"),
        };
    });
};

const onAppointmentMove = (evt, resourceId, time, dateStr) => {
    const movedItem = evt?.added?.element || evt?.moved?.element || null;
    if (!movedItem?.id) return;

    const targetStart = moment(time, ["h:mma", "ha"], true);
    localAppointments.value = localAppointments.value.map((item) => {
        if (item.id !== movedItem.id) return item;

        const currentStart = moment(item.start_time, TIME_INPUT_FORMATS, true);
        const currentEnd = moment(item.end_time, TIME_INPUT_FORMATS, true);
        const duration =
            currentStart.isValid() && currentEnd.isValid()
                ? Math.max(15, currentEnd.diff(currentStart, "minutes"))
                : 30;

        const safeStart = targetStart.isValid() ? targetStart : currentStart;
        const safeEnd = safeStart.clone().add(duration, "minutes");

        return {
            ...item,
            resource_id: resourceId,
            dentist_id: resourceId,
            appointment_date: dateStr || item.appointment_date,
            start_time: safeStart.format("hh:mm A"),
            end_time: safeEnd.format("hh:mm A"),
        };
    });
};

const onTaskCompleteChange = ({ appointment, checked }) => {
    if (!appointment?.id) return;
    localAppointments.value = localAppointments.value.map((item) =>
        item.id === appointment.id ? { ...item, is_completed: checked } : item,
    );
};

const addReservation = (type = "appointment") => {
    const resourceId = selectedResources.value[0] ?? availableResources.value[0]?.xid;
    if (!resourceId) return;

    const start = moment("09:00 AM", "hh:mm A");
    const end = start.clone().add(30, "minutes");
    const date = currentDate.value.format(DATE_FORMAT_DB);
    const nextId = Date.now();

    localAppointments.value = [
        ...localAppointments.value,
        {
            id: nextId,
            xid: nextId,
            type,
            title:
                type === "event"
                    ? t("calendar.new_event")
                    : type === "task"
                      ? t("calendar.new_task")
                      : t("appointments.new_appointment"),
            patient_name:
                type === "appointment" ? t("appointments.new_appointment") : "",
            resource_id: resourceId,
            dentist_id: resourceId,
            appointment_date: date,
            start_time: start.format("hh:mm A"),
            end_time: end.format("hh:mm A"),
            color: getResourceById(resourceId)?.color || "#039be5",
            status: "scheduled",
            is_completed: false,
        },
    ];
};

const openAppointment = () => {};
const onSlotClick = () => {};

const handleMonthDayClick = (date) => {
    currentDate.value = date.clone();
    viewMode.value = "day_single";
};

const handleViewChange = ({ mode, date }) => {
    if (date) currentDate.value = date;
    if (mode) viewMode.value = mode;
};

const printCalendar = () => {
    window.print();
};

const goToToday = () => {
    currentDate.value = moment();
};

const previousDate = () => {
    if (viewMode.value === "week") {
        currentDate.value = currentDate.value.clone().subtract(1, "week");
        return;
    }

    if (viewMode.value === "month" || viewMode.value === "agenda") {
        currentDate.value = currentDate.value.clone().subtract(1, "month");
        return;
    }

    currentDate.value = currentDate.value.clone().subtract(1, "day");
};

const nextDate = () => {
    if (viewMode.value === "week") {
        currentDate.value = currentDate.value.clone().add(1, "week");
        return;
    }

    if (viewMode.value === "month" || viewMode.value === "agenda") {
        currentDate.value = currentDate.value.clone().add(1, "month");
        return;
    }

    currentDate.value = currentDate.value.clone().add(1, "day");
};

const onViewModeChange = (mode) => {
    viewMode.value = mode;
};
</script>
