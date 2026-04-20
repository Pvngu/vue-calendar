<template>
    <a-modal
        :open="visible"
        :title="
            $t(
                'calendar.reschedule_this_appointment',
                'Reschedule this appointment?',
            )
        "
        :closable="true"
        @cancel="handleCancel"
        destroyOnClose
        :footer="null"
        width="480px"
    >
        <div class="flex flex-col gap-5 mt-6 px-2">
            <div class="flex items-start gap-4 text-[15px]">
                <span class="text-gray-500 w-[45px] text-right">{{
                    $t("common.from", "From:")
                }}</span>
                <div class="flex-1 flex gap-4 text-gray-800 tracking-wide">
                    <span>{{ data?.originalStartStr }}</span>
                    <span>{{ data?.originalTimeStr }}</span>
                </div>
            </div>

            <div class="flex items-start gap-4 text-[15px]">
                <span class="text-gray-500 w-[45px] text-right">{{
                    $t("common.to", "To:")
                }}</span>
                <div class="flex-1 flex gap-4 text-gray-800 tracking-wide">
                    <span>{{ data?.newStartStr }}</span>
                    <span>{{ data?.newTimeStr }}</span>
                </div>
            </div>

            <div
                v-if="!data?.isEvent && !data?.isTask"
                class="mt-3 text-[15px]"
            >
                <a-checkbox
                    v-model:checked="localNotifyGuests"
                    class="text-gray-800"
                >
                    {{ $t("calendar.notify_provider_guests") }}
                </a-checkbox>
            </div>  

            <!-- Recurrence Update Options -->
            <div
                v-if="data?.appointment?.series_id"
                class="mt-4 border-t pt-4 text-[15px]"
            >
                <p class="font-medium text-gray-800 mb-3">
                        {{
                        $t(
                            "calendar.recurring_event_update_scope",
                            "This is a repeating event. Which occurrences should be rescheduled?",
                        )
                    }}
                </p>
                <a-radio-group
                    v-model:value="recurrenceMode"
                    style="display: flex; flex-direction: column; gap: 12px;"
                >
                    <a-radio value="this">
                        {{ $t("calendar.this_event", "This event") }}
                    </a-radio>
                    <a-radio v-if="!data?.isFirstInSeries" value="following">
                        {{
                            $t(
                                "calendar.this_and_following",
                                "This and following events",
                            )
                        }}
                    </a-radio>
                    <a-radio value="all">
                        {{
                            $t(
                                "calendar.all_events",
                                "All events in the series",
                            )
                        }}
                    </a-radio>
                </a-radio-group>
            </div>

            <div class="flex justify-end items-center gap-4 mt-8">
                <a-button type="text" @click="handleCancel">
                    {{ $t("calendar.no_keep") }}
                </a-button>
                <a-button
                    type="primary"
                    :loading="loading"
                    @click="handleConfirm"
                >
                    {{ $t("calendar.yes_reschedule") }}
                </a-button>
            </div>
        </div>
    </a-modal>
</template>

<script setup>
import {
    Modal as AModal,
    Checkbox as ACheckbox,
    Radio as ARadio,
    Button as AButton,
} from "ant-design-vue";
import { ref, watch } from "vue";

const ARadioGroup = ARadio.Group;

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    data: {
        type: Object,
        default: null,
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["update:visible", "confirm", "cancel"]);

const localNotifyGuests = ref(true);
const recurrenceMode = ref("this");

watch(
    () => props.visible,
    (newVal) => {
        if (newVal) {
            localNotifyGuests.value = true;
            recurrenceMode.value = "this";
        }
    },
);

const handleCancel = () => {
    emit("update:visible", false);
    emit("cancel");
};

const handleConfirm = () => {
    emit("confirm", {
        notifyGuests: localNotifyGuests.value,
        updateMode: props.data?.appointment?.series_id
            ? recurrenceMode.value
            : null,
    });
};
</script>
