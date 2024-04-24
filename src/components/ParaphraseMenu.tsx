
import * as React from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

type dialogProps = {
  anchorEl: null | HTMLElement;
  open: boolean;
  handleClose: () => void;
  handleClick: () => void
};

export default function ParaphraseMenu(props: dialogProps) {
  return (
    <div>
      <Menu
        anchorEl={props.anchorEl}
        open={props.open}
        onClose={props.handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MenuItem onClick={props.handleClick}>Rewrite</MenuItem>
      </Menu>
    </div>
  );
}
