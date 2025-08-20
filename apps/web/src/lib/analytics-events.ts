export const track = (eventName: string, properties?: Record<string, any>) => {

export const trackAatxCoderButtonClicked = (tracking_plan_id: string) => {
  track('aatx_coder_button: clicked', { tracking_plan_id });
};

export const trackAsdgasdg = () => {
  track('asdgasdg');
};


  console.log(`Tracking event: ${eventName}`, properties);
};

